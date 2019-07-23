function showOuinetDetails() {
  browser.tabs.query({active: true})
    .then((tabs) => {
      const key = tabs[0].id;
      getCacheEntry(tabs[0].id, updatePage);
  });
}

function getCacheEntry(tabId, callback) {
  return browser.storage.local.get('cache', function(data) {
    if (!data.cache || !data.cache[tabId]) {
      callback();
      return;
    }
    browser.tabs.get(tabId)
      .then((tab) => {
        var fromUrl = data.cache[tabId][tab.url];
        if (fromUrl) {
          callback(fromUrl, tab.url);
          return;
        }
        var origin = new URL(tab.url).origin;
        callback(data.cache[tabId][origin], origin);
      });
  });
}

function updatePage(details, url) {
  if (details) {
    document.getElementById('url').innerHTML = 'URL: ' + url;
    document.getElementById('time').innerHTML = 'Retrieved at ' + details.injectionTime;
  } else {
    document.getElementById('url').innerHTML = '';
    document.getElementById('time').innerHTML = '';
  }
}

showOuinetDetails();