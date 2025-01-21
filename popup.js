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

const smallStyle = {
  headerHeight: "60px",
  fontSize: "1em",
  paraPadding: "0 20px;",
  valPadding: "20px",
  margin: "0 0 10px 0",
};

const mediumStyle = {
  headerHeight: "80px",
  fontSize: "2em",
  paraPadding: "0 30px;",
  valPadding: "30px",
  margin: "0 0 15px 0",
};

const bigStyle = {
  headerHeight: "120px",
  fontSize: "3em",
  paraPadding: "0 40px;",
  valPadding: "40px",
  margin: "0 0 20px 0",
};

function setStyle(size) {
  if (size == null)
    return;

  var style = {};
  if (size == "small_style") {
    style = smallStyle;
  }
  else if (size == "med_style") {
    style = mediumStyle;
  }
  else if (size == "big_style") {
    style = bigStyle;
  }

  const h = document.getElementById('header');
  h.style.height = style.headerHeight;
  h.style.lineHeight = style.headerHeight;
  h.style.fontSize = style.fontSize;
  h.style.paddingLeft = style.valPadding;

  const paras = document.querySelectorAll('p');
  Array.from(paras).map(p => {
    p.style.fontSize = style.fontSize;
    p.style.padding = style.paraPadding;
  });

  const tables = document.querySelectorAll('table');
  Array.from(tables).map(t => {
    t.style.padding = style.padding;
    t.style.fontSize = style.fontSize;
  });

  const values = document.querySelectorAll('.value');
  // TODO: account for bi-directional i18n
  Array.from(values).map(v => v.style.paddingLeft = style.valPadding);

  const m = document.getElementById('see-manual');
  m.style.margin = style.margin;
  m.style.fontSize = style.fontSize;
}

(async function start() {

  browser.storage.local.get("style").then(item => setStyle(item.style));

  while (true) {
    await updatePage();
    await sleep(0.5);
  }
})();
