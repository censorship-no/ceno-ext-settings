(function(){
  'use strict';
  console.log("content.js");
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log("page already loaded");
    updatePageAction();
  } else {
    console.log("added listener");
    window.addEventListener('DOMContentLoaded', updatePageAction);
  }
  function updatePageAction() {
    console.log("Page ready");
    setTimeout(() => browser.runtime.sendMessage({}), 0);
  }
})();
