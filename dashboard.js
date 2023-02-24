'use strict';

function dlog(text) {
  const elem = document.getElementById('log-area');
  elem.innerHTML += `${text}\n`;
  elem.scrollTop = elem.scrollHeight;
}

function initWebtorrent() {
  dlog("Initializing WebTorrent...");

  // TODO
}


// Set up port to receive messages from background.js
let bgPort = browser.runtime.connect({ name: 'wt-port' });
bgPort.onMessage.addListener((msg) => {

  if (!msg) { return }
  if (msg.message === 'wt_fetch') {
    dlog("Lookup group: " + msg.group);
    dlog("    infohash: " + msg.infohash);

    // TODO
  }

});

// main onload
window.addEventListener("load", async () => {

  initWebtorrent();

});
