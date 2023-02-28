'use strict';

import WebTorrent from './libs/webtorrent.min.js';

let wtClient;

function dlog(text) {
  const elem = document.getElementById('log-area');
  elem.innerHTML += `${text}\n`;
  elem.scrollTop = elem.scrollHeight;
}

function initWebtorrent() {
  dlog("Initializing WebTorrent...");

  if (WebTorrent.WEBRTC_SUPPORT) {
    dlog("WebRTC supported");
  } else {
    dlog("WebRTC not supported!");
    return;
  }

  wtClient = new WebTorrent();

  wtClient.on('error', (err) => {
    dlog("WT ERROR: " + err.message); // DEBUG
  });

}

// TEST
async function onTorrent(torrent) {

  dlog("Torrent name: " + torrent.name);
  dlog("    infohash: " + torrent.infoHash);

  torrent.on('error', (err) => {
    dlog("torrent error: " + err.message); // DEBUG
  });

  torrent.on('warning', (err) => {
    dlog("torrent warning: " + err.message); // DEBUG
  });

  torrent.on('ready', () => {
    dlog("torrent ready."); // DEBUG
  });

  torrent.on('done', () => {
    dlog("torrent finished downloading"); // DEBUG
    for (const file of torrent.files) {
      dlog("  filename: " + file.name); // DEBUG
    }
  });
}

// Set up port to receive messages from background.js
let bgPort = browser.runtime.connect({ name: 'wt-port' });
bgPort.onMessage.addListener((msg) => {

  if (!msg) { return }
  if (msg.message === 'wt_fetch') {
    dlog("Lookup group: " + msg.group);
    dlog("    infohash: " + msg.infohash);

    // TESTING
    if (wtClient) {
      // start downloading a new torrent
      dlog("Fetching torrent..."); // DEBUG
      wtClient.add(msg.infohash, onTorrent);
      // TODO: How do we know if it can be found?
    }

  }

});

// main onload
window.addEventListener('load', async () => {

  initWebtorrent();

});

// before window closes
window.addEventListener('beforeunload', (event) => {

  // TODO: could popup confirmation to close dialog
  // event.preventDefault();

  wtClient && wtClient.destroy((err) => {
    console.error("WebTorrent client not destroyed! ", err); // DEBUG
    // BUG: reached here with err === null
  });

});
