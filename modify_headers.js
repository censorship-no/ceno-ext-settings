"use strict";

function addIsPrivateHeader(e) {
  var tabId = e.tabId;
  if (tabId < 0) {
    console.log("Invalid tab ID: " + tabId);
    return;
  }
  return browser.tabs.get(tabId).then(tab => {
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

browser.webRequest.onBeforeSendHeaders.addListener(
  addIsPrivateHeader,
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]);

browser.webRequest.onHeadersReceived.addListener(
  redirect403ToHttps,
  {urls: ["<all_urls>"]},
  ["blocking", "responseHeaders"]
);
