'use strict';

function sleep(s) {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}

function queryTabs(query) {
  return new Promise(resolve => { browser.tabs.query(query).then(resolve); });
}

function getCacheEntry(what) {
  return new Promise(resolve => { browser.storage.local.get(what).then(resolve); });
  // return browser.storage.local.get(what); // TODO: or should it be this?
}

async function updatePage() {
  const active_tabs = await queryTabs({active:true});
  if (!active_tabs.length) return;
  const tabId = active_tabs[0].id;
  const data = await getCacheEntry('stats');
  if (!data || !data.stats || !data.stats[tabId]) return;

  const set = (name) => {
    var value = data.stats[tabId][name];
    if (!value) value = 0;
    document.getElementById(name).textContent = value;
  };

  set('origin');
  set('proxy');
  set('injector');
  set('dist-cache');
  set('local-cache');
}

(async function start() {
  while (true) {
    await updatePage();
    await sleep(0.5);
  }
})();
