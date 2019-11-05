'use strict';
const CENO_ICON = "icons/ceno-logo-32.png";
const CACHE_MAX_ENTRIES = 500;
const OUINET_RESPONSE_VERSION = "2"  // protocol version accepted and used

function addIsPrivateHeader(e) {
  if (e.tabId < 0) {
    return;
  }
  return browser.tabs.get(e.tabId).then(tab => {
      let is_private = tab.incognito ? "True" : "False";
      e.requestHeaders.push({name: "X-Is-Private", value: is_private});
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
// Chrome's webRequest doc is a bit better ATM
// https://developer.chrome.com/extensions/webRequest
var versionError = false;
function redirectWhenUpdateRequired(e) {
  if (!versionError) {
    for (var i in e.responseHeaders) {
        var h = e.responseHeaders[i];
        if (h.name.toUpperCase() === "X-OUINET-ERROR") {
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

function updateOuinetDetailsFromHeaders(e) {
  if (e.tabId < 0) {
    return;
  }
  // Use the URL from the request as the key instead of the URL
  // from the tab because if there is a redirect the tab URL has not been updated
  // yet
  insertCacheEntry(e.tabId, e.url, getOuinetDetails(e.responseHeaders));
}

const INJ_TS_RE = /\bts=([0-9]+)\b/;
function getOuinetDetails(headers) {
  var details = {
    isProxied: false,
    injectionTime: null,
    requestTime: Date.now() / 1000,  // seconds
  };
  var no_details = Object.assign({}, details);
  var valid_proto = false;
  for (var i = 0; i < headers.length; i++) {
    switch (headers[i].name.toUpperCase()) {
      case "X-OUINET-VERSION":
        valid_proto = (headers[i].value === OUINET_RESPONSE_VERSION);
        break;
      case "X-OUINET-INJECTION":
        details.isProxied = true;
        var ts_match = INJ_TS_RE.exec(headers[i].value);
        if (ts_match) {
          details.injectionTime = ts_match[1] - 0;
        }
        break;
    }
  }
  return (valid_proto ? details : no_details);
}

function insertCacheEntry(tabId, url, details) {
  browser.storage.local.get('cache', function(data) {
    if (!data.cache) {
      data.cache = {};
    }
    if (!data.cache[tabId]) {
      data.cache[tabId] = {};
    }
    if (size(data.cache[tabId]) >= CACHE_MAX_ENTRIES) {
      removeOldestEntries(data.cache[tabId]);
    }
    data.cache[tabId][url] = details;
    // Store an entry for the origin as well because single-page-apps,
    // change the URL without causing requests.
    data.cache[tabId][new URL(url).origin] = details;
    browser.storage.local.set(data);
  });
}

function removeOldestEntries(entries) {
  var array = Object.entries(entries);
  array.sort(([k1,v1],[k2,v2]) => v1.requestTime - v2.requestTime);
  var i = 0;
  while (size(entries) > CACHE_MAX_ENTRIES) {
    delete entries[array[i++][0]];
  }
}

function size(o) {
  return Object.keys(o).length;
}

function setPageActionIcon(tabId, isUsingOuinet) {
  if (isUsingOuinet) {
    browser.pageAction.show(tabId);
  } else {
    browser.pageAction.hide(tabId);
  }
}

/**
 * Updates the icon for the page action using the details
 * about the page from local storage.
 */
function setPageActionForTab(tabId) {
  getCacheEntry(tabId, (ouinetDetails) => {
      var isUsingOuinet = ouinetDetails && ouinetDetails.isProxied;
      setPageActionIcon(tabId, isUsingOuinet);
  });
}

function getCacheEntry(tabId, callback) {
  return browser.storage.local.get('cache', function(data) {
    if (!data.cache || !data.cache[tabId]) {
      callback(undefined);
      return;
    }
    browser.tabs.get(tabId)
      .then((tab) => {
        var fromUrl = data.cache[tabId][tab.url];
        if (fromUrl) {
          callback(fromUrl);
          return;
        }
        var origin = new URL(tab.url).origin;
        callback(data.cache[tabId][origin]);
      });
  });
}

/**
 * Remove entries from local storage when tab is removed.
 */
function removeCacheForTab(tabId) {
  browser.storage.local.get('cache', function(data) {
    if (!data.cache) {
      return;
    }
    // Remove all entries for the tab.
    delete data.cache[tabId];
    browser.storage.local.set(data);
  });
};

function clearLocalStorage() {
  browser.storage.local.get('cache', function(data) {
    if (!data.cache) {
      return;
    }
    browser.tabs.query({}).then((tabs) => {
      var tabIds = tabs.map((tab) => tab.id);
      for (let key of Object.keys(data.cache)) {
        if (!tabIds.includes(key)) {
          delete data.cache[key];
        }
      }
      browser.storage.local.set(data);
    });
  });
}

browser.browserAction.onClicked.addListener(function() {
  var url = browser.extension.getURL("settings.html");
  browser.tabs.create({url: url});
})

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

browser.webRequest.onHeadersReceived.addListener(
  updateOuinetDetailsFromHeaders,
  {urls: ["<all_urls>"]},
  ["responseHeaders"]
);

browser.runtime.onMessage.addListener(
  (request, sender, sendResponse) => setPageActionForTab(sender.tab.id));

browser.runtime.onStartup.addListener(clearLocalStorage);

/**
 * Each time a tab is updated, reset the page action for that tab.
 */
browser.tabs.onUpdated.addListener(
  (id, changeInfo, tab) => setPageActionForTab(id));

/**
 * Initialize all tabs.
 */
browser.tabs.query({}).then(
  (tabs) => tabs.map((tab) => setPageActionForTab(tab.id)));

browser.tabs.onRemoved.addListener(
  (id) => removeCacheForTab(id));

browser.pageAction.onClicked.addListener(browser.pageAction.openPopup);
