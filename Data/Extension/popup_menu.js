document.addEventListener("click", (onClick) => {
  if (onClick.target.id === "save") {
        chrome.runtime.sendMessage({action: "save"}, function(response) {});
  } else if (onClick.target.id === "no-save") {
        chrome.runtime.sendMessage({action: "noSave"}, function (response) {});
  } else if (onClick.target.id === "copy-cookies") {
        chrome.runtime.sendMessage({action: "copyCookies"}, function (response) {});
  } else if (onClick.target.id === "paste-cookies") {
        chrome.runtime.sendMessage({action: "pasteCookies"}, function (response) {});
  } else if (onClick.target.id === "restartSshPlugin") {
      var port = chrome.runtime.connect({name: "mla"});
      port.postMessage({action: "restartSshPlugin"});
      port.onMessage.addListener(function(r) {
        if(r.response.isLoading){
            showLoader(onClick.target);
        }
        if(!r.response.isLoading){
            hideLoader(onClick.target);
        }
        if(r.response.success){
            showAlert(onClick.target, 'SSH reconnected. Refresh the page.', 'success');
        }
        if(r.response.error){
            showAlert(onClick.target, 'Could not reconnect SSH.', 'error');
        }
    });
  } 
});

chrome.runtime.sendMessage({action: "popup"}, function(r) {
    if(r.response.restartSshPluginBtn){
        document.getElementById("popupFooter").style.display = "block";
    }
    if(r.response.quickProfile) {
        document.getElementById('save').setAttribute('disabled', true);
        var btn = document.getElementById('no-save');
        btn.setAttribute('disabled', true);
        showAlert(btn, 'Quick browser profile data cannot be saved.', 'info');
    }
});

function showLoader(btn) {
    btn.classList.add('loading');
    btn.innerHTML = 'Restarting...';
    btn.setAttribute('disabled', true);
}

function hideLoader(btn) {
    btn.classList.remove('loading');
    btn.innerText = 'Restart SSH';
    btn.removeAttribute('disabled');
}

function showAlert(btn, message, status){
    hideAlerts();
    var alert = document.createElement('div');
    alert.className = 'alert alert-'+ status + ' icon';
    alert.innerText = message;
    btn.after(alert);
}

function hideAlerts() {
    var alerts = document.getElementsByClassName('alert');
    while(alerts.length > 0){
        alerts[0].parentNode.removeChild(alerts[0]);
    }
}

function InitTranslateView() {
    document.getElementById('translated_activated').checked = localStorage.getItem('translate') == 1;
    document.getElementById('translated_activated').addEventListener('change', (event) => {
        var inUse=event.target.checked ? 1 : 0;
        console.log('Check changed: '+inUse);
        localStorage.setItem('translate', inUse);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    InitTranslateView();
});