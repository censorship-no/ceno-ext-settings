"use strict";

function addIsPrivateHeader(e) {
  return browser.tabs.get(e.tabId).then(tab => {
      let is_private = tab.incognito ? "True" : "False";
      e.requestHeaders.push({name: "X-Firefox-Is-Private", value: is_private});
      return {requestHeaders: e.requestHeaders};
  });
}
browser.webRequest.onBeforeSendHeaders.addListener(addIsPrivateHeader, {urls: ["<all_urls>"]}, ["blocking", "requestHeaders"]);