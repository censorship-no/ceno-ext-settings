'use strict';

function addIsPrivateHeader(e) {
  if (e.tabId < 0) {
    return;
  }
  return browser.tabs.get(e.tabId).then(tab => {
      let is_private = tab.incognito ? "True" : "False";
      e.requestHeaders.push({name: "X-Firefox-Is-Private", value: is_private});
      return {requestHeaders: e.requestHeaders};
  });
}

function redirect403ToHttps(e) {
  if (e.statusCode == 403 && e.url.startsWith('http:')) {
    console.log("Redirecting to HTTPS");
    var redirect = new URL(e.url);
    redirect.protocol = 'https';
    redirect.port = '';
    return {redirectUrl: redirect.href};
  }
}

// Useful links:
// https://github.com/mdn/webextensions-examples/tree/master/http-response
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onHeadersReceived
//
// Chrome's webRequest doc is a bit better ATM
// https://developer.chrome.com/extensions/webRequest
var versionError = false;
function redirectWhenUpdateRequired(e) {
  if (!versionError) {
    for (var i in e.responseHeaders) {
        var h = e.responseHeaders[i];
        if (h.name == "X-Ouinet-Error") {
            var ec = h.value.substring(0, 2);
            if (ec === "0 " || ec === "1 ") {
                versionError = true;
            }
        }
    }
  }
  if (versionError && !isAppStoreUrl(e.url)) {
    return {
      redirectUrl: browser.extension.getURL("update-page/index.html"),
    };
  }
}

const APP_STORES = ["play.google.com", "paskoocheh.com", "s3.amazonaws.com"];
function isAppStoreUrl(url) {
  const hostname = new URL(url).hostname;
  return APP_STORES.includes(hostname);
}

browser.webRequest.onBeforeSendHeaders.addListener(
  addIsPrivateHeader,
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]);

browser.webRequest.onHeadersReceived.addListener(
  redirect403ToHttps,
  {urls: ["<all_urls>"]},
  ["blocking", "responseHeaders"]
);

browser.webRequest.onHeadersReceived.addListener(
  redirectWhenUpdateRequired,
  {urls: ["<all_urls>"]},
  ["blocking", "responseHeaders"]
);

browser.browserAction.onClicked.addListener(function() {
  var url = browser.extension.getURL("settings.html");
  browser.tabs.create({url: url});
})
