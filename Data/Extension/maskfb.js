chrome.runtime.onMessage.addListener(function (request, sender) {
    if (request.action == "getSource") {

        token.value = request.source;

        var disable_reasons = ['', 'ADS_INTEGRITY_POLICY', 'ADS_IP_REVIEW', 'RISK_PAYMENT', 'GRAY_ACCOUNT_SHUT_DOWN', 'ADS_AFC_REVIEW', 'BUSINESS_INTEGRITY_RAR', 'PERMANENT_CLOSE', 'UNUSED_RESELLER_ACCOUNTR'];
        var account_statuses = { 1: 'ACTIVE', 2: 'DISABLED', 3: 'UNSETTLED', 7: 'PENDING_RISK_REVIEW', 8: 'PENDING_SETTLEMENT', 9: 'IN_GRACE_PERIOD', 100: 'PENDING_CLOSURE', 101: 'CLOSED', 201: 'ANY_ACTIVE', 202: 'ANY_CLOSED' };

        var xhr = new XMLHttpRequest();
        xhr.open("GET", 'https://graph.facebook.com/v11.0/me/adaccounts?fields=name,ads.limit(500){status,effective_status,delivery_info,configured_status,bid_info,name,ad_review_feedback,adlabels,created_time,recommendations,updated_time,insights.limit(500){results},adcreatives.limit(500){image_crops,image_url,status,thumbnail_url}},adspaymentcycle,currency,account_status,disable_reason,reachfrequencypredictions{status,reservation_status,campaign_time_stop,campaign_time_start,story_event_type},age,end_advertiser_name,amount_spent,spend_cap,adtrust_dsl&limit=500&locale=ru_RU&access_token=' + request.source, true);

        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                var accounts = JSON.parse(xhr.responseText);

                for (var account in accounts['data']) {

                    var username = accounts.data[account]['name'];
                    var account_status = accounts.data[account]['account_status'];
                    var disable_reason = accounts.data[account]['disable_reason'];
                    var parent = document.getElementById('table');
                    var adtrust_dsl = accounts.data[account]['adtrust_dsl'];
                    var adspaymentcycle = accounts.data[account]['adspaymentcycle'];
                    var threshold = adspaymentcycle == null ? -1 : adspaymentcycle['data'][0]['threshold_amount'] / 100;
                    var currency = accounts.data[account]['currency'];
                    var billing = threshold + ' ' + currency;

                    if (accounts.data[account]['ads']) {
                        for (var ads in accounts.data[account]['ads']) {
                            for (var adss in accounts.data[account]['ads'][ads]) {
                                if (accounts.data[account]['ads'][ads][adss]['status']) {

                                    var thumbnail_url = accounts.data[account]['ads'][ads][adss]['adcreatives']['data'][0]['thumbnail_url'];
                                    var name = accounts.data[account]['ads'][ads][adss]['name'];

                                    var effective_status = accounts.data[account]['ads'][ads][adss]['effective_status'];

                                    var tr = document.createElement('tr');
                                    var tabble_text = '';
                                    tabble_text = '<td><h6>' + username + '</h6><h6 style="color:red;">' + account_statuses[account_status] + '</h6><h6 style="color:red;">' + disable_reasons[disable_reason] + '</h6></td><td>' + adtrust_dsl + ' ' + currency + '</td><td><img src="' + thumbnail_url + '" width="50" height="50"></td><td>' + name + '</td><td><b>' + billing + '</b></td><td>' + effective_status + '</td><td>';

                                    if (accounts.data[account]['ads'][ads][adss]['ad_review_feedback']) {
                                        for (var glo in accounts.data[account]['ads'][ads][adss]['ad_review_feedback']['global']) {
                                            tabble_text += '<h5 style="color:red;">' + glo + '</h5><p>' + accounts.data[account]['ads'][ads][adss]['ad_review_feedback']['global'][glo] + '</p>';
                                        }
                                        tabble_text += '</td>';
                                    }

                                    tr.innerHTML = tabble_text;
                                    parent.appendChild(tr);
                                }
                            }
                        }
                    } else {
                        var tr = document.createElement('tr');
                        var tabble_text = '';
                        tabble_text = '<td><h6>' + username + '</h6><h6 style="color:red;">' + account_statuses[account_status] + '</h6><h6 style="color:red;">' + disable_reasons[disable_reason] + '</h6></td><td>' + adtrust_dsl + ' ' + currency + '</td><td></td><td></td><td><b>' + billing + '</b></td><td></td><td></td>';
                        tr.innerHTML = tabble_text;
                        parent.appendChild(tr);
                    }
                }


            }
        }
        xhr.send();

    }
});

function onWindowLoad() {

    var message = document.querySelector('#message');
    var token = document.querySelector('#token');

    chrome.tabs.executeScript(null, {
        file: "getPagesSource.js"
    }, function () {
        // If you try and inject into an extensions page or the webstore/NTP you'll get an error
        if (chrome.runtime.lastError) {
            message.innerText = 'Ошибка : \n' + chrome.runtime.lastError.message;
        }
    });

}

window.onload = onWindowLoad;