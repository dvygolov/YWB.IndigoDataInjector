let asyncfy = fn => (...args) => {
  return new Promise((resolve, reject) => {
    fn(...args, (...results) => {
      let { lastError } = chrome.runtime
      if (typeof lastError !== 'undefined') reject(lastError);
      else results.length == 1 ? resolve(results[0]) : resolve(results);
    });
  });
}


let isObject = function(obj) {
  var type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
};


// provide async method to all methods which have one callback.
let handler = {
  get: function(target, prop, receiver) {
    let value = target[prop]
    let type = typeof value
    if(type !== 'undefined') { // including null, false
      if( type === 'function') return value.bind(target); // correct the this for the functions, since we've substituted the original object to the proxy object
      return value;
    }

    if(prop.endsWith('Async')){
      let key = prop.replace(/Async$/, '')

      let method=target[key]
      let asyncMethod = asyncfy(method.bind(target));

      return asyncMethod;
    }
  }
}

// proxy every leaf object
let asyncfyObj = handler => obj => Object.getOwnPropertyNames(obj)
  .filter(prop => isObject(obj[prop]))
  .forEach(prop => obj[prop] = new Proxy(obj[prop], handler))

// intercept the getters of all object in chrome member
asyncfyObj(handler)(chrome)
asyncfyObj(handler)(chrome.storage)

let getActiveTabAsync = async () => {
  let tabs = await chrome.tabs.queryAsync({active: true, currentWindow: true});
  return (tabs && tabs.length > 0) ? tabs[0] : null;
}

var skipCLose = false;
var openUrl = null;
var restartSshPluginBtn = false;
var quickProfile = false;

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.action === "save") {
            closeMlaAndSave();
        } else if (request.action === "noSave") {
            closeMlaNoSave();
        } else if (request.action === "copyCookies") {
            copyCookies();
        } else if (request.action === "pasteCookies") {
            pasteCookies();
        } else if (request.action === "popup") {
            sendResponse({
                response: {
                    restartSshPluginBtn: restartSshPluginBtn,
                    quickProfile: quickProfile
                }
            });
        }
    });


async function pasteCookies() {
    let newCookies = prompt("Paste your cookies here:", "");
    newCookies = JSON.parse(newCookies);
    console.log('Parsed ' + newCookies.length + ' cookies!');
    console.log('Clearing ALL Facebook cookies...');
    var oldCookies = await asyncfy(chrome.cookies.getAll)({ domain: ".facebook.com" });
    for(var i=0; i<oldCookies.length;i++) {
        var cookie = oldCookies[i];
        await asyncfy(chrome.cookies.remove(
        {
            "url": "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain + cookie.path,
            "name": cookie.name
        }));
        console.log('Deleted cookie: ' + JSON.stringify(cookie));
    }

    for(var i=0; i<newCookies.length;i++) {
        var cookie = newCookies[i];
        if (cookie.domain != '.facebook.com') {
            continue;
        }
        var clear_cookie = {
            url: "https://www.facebook.com",
            domain: cookie.domain,
            path: cookie.path,
            name: cookie.name,
            value: cookie.value,
            expirationDate: (new Date().getTime()/1000) + (3600*24*90)
        };
        console.log('Adding cookie: ' + JSON.stringify(clear_cookie));
        await asyncfy(chrome.cookies.set(clear_cookie));
    };

    console.log('Cookies import done!');
    var tabs = await asyncfy(chrome.tabs.query)({ active: true, currentWindow: true });
    console.log(JSON.stringify(tabs[0]));
    chrome.tabs.reload(tabs[0].id);
}

function copyCookies() {
    chrome.cookies.getAll({ domain: ".facebook.com" }, function (cookies) {
        copy(JSON.stringify(cookies));
    });
}

function copy(text) {
    const ta = document.createElement('textarea');
    ta.style.cssText = 'opacity:0; position:fixed; width:1px; height:1px; top:0; left:0;';
    ta.value = text;
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    ta.remove();
}

chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (request) {
        if (request.action == "restartSshPlugin") {
            restartSshPlugin(function (result) {
                port.postMessage(result);
            });
        }
    });
});

function closeMlaAndSave() {
    if (mlaConf.url == null) {
        var message = "Session is not loaded. Closing browser.";
        logError(message);
        closeBrowser();
    }
    var closeMessage = "Saving session. Please wait until the browser is closed automatically.";
    logInfo(closeMessage)
    chrome.tabs.query({}, function (tabs) {
        var tabArr = new Array();
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (tab.url.indexOf(openUrl) > -1 ||
                tab.url.indexOf("local.app.multiloginapp.com") > -1) {
                continue;
            }
            tabArr.push(tab.url);
        }
        storeData(tabArr);
    });
}

function closeMlaNoSave() {
    if (mlaConf.url == null) {
        var message = "Session is not loaded. Closing browser.";
        logError(message);
        closeBrowser();
    }
    var closeMessage = "Closing browser without saving any data.";
    logInfo(closeMessage);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            var response = JSON.parse(xhr.responseText);
            if (response && typeof response === 'object' && response.status === 'OK') {
                closeAllTabs(function () {
                    closeBrowser();
                });
            } else {
                logInfo("Error occured while closing browser - " + JSON.stringify(response));
            }
        }
    };
    xhr.open("GET", mlaConf.url + mlaConf.btype + "/ns/" + mlaConf.sid);
    xhr.send();
}

function storeData(tabArr) {
    var data = {
        tabs: tabArr
    };
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            var response = JSON.parse(xhr.responseText);
            if (response.status == 'OK') {
                closeBrowser();
            } else {
                var message = 'Failed to save session data. Please try again later.';
                logError(message + ': ' + xhr.responseText);
                alert(message);
                skipCLose = false;
            }
        }
    };
    xhr.open("POST", mlaConf.url + mlaConf.btype + "/s/" + mlaConf.sid);
    xhr.send(JSON.stringify(data));
}

//////
//////
function init() {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            var response = JSON.parse(xhr.responseText);
            if (response.status == 'OK') {
                startMLA(response.value);
            } else {
                var message = 'Failed to load session data';
                logError(message + ': ' + xhr.responseText);
                alert(message);
                closeBrowser();
            }
        }
    }
    xhr.open("GET", mlaConf.url + "s/g/" + mlaConf.sid);
    xhr.send();
}

//////
//////

function startMLA(data) {
    openUrl = data.bed.u;
    restartSshPluginBtn = data.bed.ppr;

    if (data.bed.sn === "quick profile")
        quickProfile = true;

    if (data.bed.e) {
        initExp();
    }
    if (data.bed.ncbu) {
        ncbu(data.bed.ncbu);
    }
    validateProxy(data);
}

function validateProxy(data) {
    chrome.windows.getCurrent(function (w) {
        chrome.windows.update(w.id, { state: "maximized" }, function (windowUpdated) {
        });
    });
    if (typeof data.bd === 'undefined') {
        chrome.tabs.query({ url: openUrl }, function (tabs) {
            if (tabs.length == 0) {
                chrome.tabs.create({ url: openUrl, active: true, index: 0 });
            }
        });
        return;
    }
    var chromeData = data.bd;
    closeAllTabs(function (firstTab) {
        if (chromeData.cookies) {
            for (var i = 0; i < chromeData.cookies.length; i++) {
                var cookie = chromeData.cookies[i];

                delete cookie.browserType;
                delete cookie.storeId;
                delete cookie.hostOnly;
                if (cookie.session) {
                    delete cookie.expirationDate;
                }
                delete cookie.session;

                var domain = cookie.domain;
                while (domain.charAt(0) === '.') {
                    domain = domain.substr(1);
                }
                cookie.url = "http" + (cookie.secure ? "s" : "") + "://" + domain + cookie.path;

                try {
                    chrome.cookies.set(cookie);
                } catch (e) {
                    logError("can't set cookie" + e);
                }
            }
        }
        if (firstTab) {
            chrome.tabs.update(firstTab.id, { url: openUrl, active: true });
        } else {
            chrome.tabs.create({ url: openUrl, active: true });
        }
        if (chromeData.tabs) {
            for (var i = 0; i < chromeData.tabs.length; i++) {
                var tabUrl = chromeData.tabs[i];
                if (tabUrl.indexOf("local.app.multiloginapp.com") > -1) {
                    continue;
                }
                chrome.tabs.create({ url: tabUrl, active: false });
            }
        }
    });
}

function closeBrowser() {
    chrome.windows.getAll({}, function (windowArray) {
        for (var i = 0; i < windowArray.length; i++) {
            var window = windowArray[i];
            chrome.windows.remove(window.id);
        }
    });
    chrome.processes.getProcessInfo([], false, function (processes) {
        for (var i = 0; i < processes.length; i++) {
            var process = processes[i];
            if (process.type === 'browser') {
                try {
                    chrome.processes.terminate(process.id);
                } catch (e) {
                    console.error(e);
                }
            }

        }
    });
}

//////
//////

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.mlaLog) {
        if (request.level == "error") {
            logError(request.message);
        } else {
            logInfo(request.message);
        }
    }
});

function logError(msg) {
    console.error(msg);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", mlaConf.url + "log/e/" + mlaConf.sid, false);
    xhr.send(msg);
}

function logInfo(msg) {
    console.log(msg);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", mlaConf.url + "log/i/" + mlaConf.sid);
    xhr.send(msg);
}

function closeAllTabs(callback) {
    chrome.tabs.query({}, function (tabs) {
        var firstTab;
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (i == 0) {
                firstTab = tab;
                chrome.tabs.update(tab.id, { url: "about:blank" });
            } else {
                chrome.tabs.remove(tab.id);
            }
        }
        callback(firstTab);
    });
}

function initExp() {

}

var contexts = ["editable"];
for (var i = 0; i < contexts.length; i++) {
    var context = contexts[i];
    var title = "Paste as human typing (Ctrl+Shift+F)";
    var id = chrome.contextMenus.create({
        "title": title, "contexts": [context],
        "onclick": hcp
    });
}

function hcp() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", mlaConf.url + "paste/" + mlaConf.sid);
    xhr.send();
}

function restartSshPlugin(callback) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 1) {
            callback({
                response: {
                    isLoading: true
                }
            });
        }
        if (xhr.readyState === 4) {
            var response = JSON.parse(xhr.responseText);

            if (response && typeof response === 'object' && response.status === 'OK') {
                logInfo("SSH restarted successfully - " + JSON.stringify(response));
                callback({
                    response: {
                        isLoading: false,
                        success: true
                    }
                });
            } else {
                logError(JSON.stringify(response));
                callback({
                    response: {
                        isLoading: false,
                        error: true
                    }
                });
            }
        }
    };

    xhr.open("GET", mlaConf.url + "proxy-plugin/restart/" + mlaConf.sid);
    xhr.send();
}

chrome.commands.onCommand.addListener(function (command) {
    if (command == "csp") {
        closeMlaAndSave();
    } else if (command == "cwsp") {
        closeMlaNoSave();
    } else if (command == "hcp") {
        hcp();
    }
});


function ncbu(urls) {
    if (urls.length < 1) {
        return;
    }
    chrome.webRequest.onBeforeRequest.addListener(
        function (details) { return { redirectUrl: "data:text/plain;base64,UGFnZSByZW5kZXJpbmcgZm9yY2VkIHRvIHN0b3AgdG8gcHJldmVudCByZXZlcnNlIGVuZ2luZWVyaW5nIG9mIE5hdHVyYWwgQ2FudmFzLiBOYXR1cmFsIENhbnZhcyB3aWxsIGNvbnRpbnVlIHdvcmtpbmcgbm9ybWFsbHkgb24gb3RoZXIgd2Vic2l0ZXMuIENvbnRhY3QgY3VzdG9tZXIgc3VwcG9ydCBhdCBzdXBwb3J0QG11bHRpbG9naW4uY29tIGZvciBtb3JlIGluZm9ybWF0aW9u" }; },
        { urls: urls },
        ["blocking"]);
}


init();

