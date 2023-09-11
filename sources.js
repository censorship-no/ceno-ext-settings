'use strict';

function sleep(s) {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}

function queryTabs(query) {
  return new Promise(resolve => { browser.tabs.query(query).then(resolve); });
}

function getCacheEntry(what) {
  return new Promise(resolve => { browser.storage.local.get(what, resolve); });
}

async function updatePage() {
  const active_tabs = await queryTabs({active:true});
  if (!active_tabs.length) return;
  const tabId = active_tabs[0].id;
  const data = await getCacheEntry('stats');
  if (!data || !data.stats || !data.stats[tabId]) return;

  var jsondata = {
    "origin": data.stats[tabId]["origin"],
    "injector": data.stats[tabId]["injector"],
    "proxy": data.stats[tabId]["proxy"],
    "dist-cache": data.stats[tabId]["dist-cache"],
    "local-cache": data.stats[tabId]["local-cache"],
  }
  document.getElementById("sources").innerHTML = JSON.stringify(jsondata, undefined, 2);

}

(async function start() {
  while (true) {
    await updatePage();
    await sleep(0.5);
  }
})();
