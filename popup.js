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

/* TODO: settings.js uses same listener, should be shared code */
document.addEventListener("click", (e) => {
    if (e.target.href) {
        browser.tabs.create({
            url: e.target.href,
            active: true
            });
        window.close();
    }
})

(async function start() {
  while (true) {
    await updatePage();
    await sleep(0.5);
  }
})();
