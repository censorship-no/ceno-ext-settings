//'use strict';
//
//// This code was showing which channel how many HTTP responses came from.
//// We now do this in the page_action popup script. I'm keeping this here
//// for a while as a backup. But feel free to remove it completely whenever
//// content script is needed for other purposes.
//
//function createClearElement(tag) {
//  var r = document.createElement(tag);
//  // TODO: Remove all css properties set by the website
//  return r;
//}
//
//class OneStat {
//  constructor(parent, label) {
//    this.currentValue = 0;
//
//    var container = createClearElement('div');
//    parent.appendChild(container);
//
//    var label_e = createClearElement('span');
//    label_e.textContent = label + ":";
//    container.appendChild(label_e);
//
//    this.value_e = createClearElement('span');
//    this.value_e.textContent = this.currentValue;
//    container.appendChild(this.value_e);
//  }
//
//  set(value) {
//    this.currentValue = value;
//    this.value_e.textContent = value;
//  }
//
//  add(value) {
//    this.currentValue += value;
//    this.value_e.textContent = this.currentValue;
//  }
//}
//
//class Statistics {
//  constructor(tabId) {
//    this.tabId = tabId;
//
//    var div = createClearElement('div');
//
//    div.style.position = "fixed";
//    div.style.top = "0";
//    div.style.right = "0";
//    div.style.width = "180px";
//    div.style.margin = "10px";
//    div.style.padding = "10px";
//    div.style.backgroundColor = "#f49a3e";
//    div.style.border = "4px solid #3ca3db";
//    div.style.zIndex = 10000;
//
//
//    var header = createClearElement('div');
//    header.style.fontWeight = "bold";
//    header.textContent = "Ceno Retrieval";
//    div.appendChild(header);
//
//    this.origin_stat        = new OneStat(div, "Origin");
//    this.proxy_stat         = new OneStat(div, "Proxy");
//    this.injector_stat      = new OneStat(div, "Injector");
//    this.distrib_cache_stat = new OneStat(div, "Distributed Cache");
//    this.local_cache_stat   = new OneStat(div, "Local Cache");
//
//    this.tab_id = createClearElement('div');
//    div.appendChild(this.tab_id);
//    document.body.appendChild(div);
//  }
//
//  getStat(which) {
//    if (which === "origin")      return this.origin_stat;
//    if (which === "proxy")       return this.proxy_stat;
//    if (which === "injector")    return this.injector_stat;
//    if (which === "dist-cache")  return this.distrib_cache_stat;
//    if (which === "local-cache") return this.local_cache_stat;
//    return null;
//  }
//}
//
//function handleMessageFromBackgroundJs(message, sender) {
//  var src = message["ouinet-source"];
//
//  if (!src) {
//    console.log("No ouinet-source in message from background.js");
//    return;
//  }
//
//  if (!document.ceno_statistics) {
//    document.ceno_statistics = new Statistics(message.tabId);
//  }
//
//  document.ceno_statistics.tab_id.textContent = "zzz:" + message.tabId + ":zzz";
//  var s = document.ceno_statistics.getStat(src);
//
//  s.add(1);
//}
//
//browser.runtime.onMessage.addListener(handleMessageFromBackgroundJs);
//
//// XXX: Why is this in a function that is called right a way?
//(function(){
//  function updatePageAction() {
//    console.log("Page ready");
//    setTimeout(() => browser.runtime.sendMessage({}), 0);
//  }
//
//  if (document.readyState === 'interactive' || document.readyState === 'complete') {
//    console.log("page already loaded ", document.ceno_statistics);
//    updatePageAction();
//  } else {
//    console.log("added listener");
//    window.addEventListener('DOMContentLoaded', updatePageAction);
//  }
//})();
