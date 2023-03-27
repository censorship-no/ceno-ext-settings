'use strict';

import WebTorrent from './libs/webtorrent.js';

let wtClient;

function dlog(text) {
  const elem = document.getElementById('log-area');
  elem.innerHTML += `${text}\n`;
  elem.scrollTop = elem.scrollHeight;
  console.log(text);
}

function initWebtorrent() {
  dlog("Initializing...");

  if (WebTorrent.WEBRTC_SUPPORT) {
    dlog("WebRTC supported.");
  }
  else {
    dlog("WebRTC not supported!");
    return;
  }

  wtClient = new WebTorrent();

  wtClient.on('error', (err) => {
    dlog(`WT ERROR: ${err.message}`);
  });

  wtClient.on('warning', (err) => {
    dlog(`WT WARN: ${err.message}`);
  });
}

// Open Blob of HTML in a new tab or window.
function openHTML(blob) {

  console.log('openHTML: ', blob); // DEBUG

  let blobUrl = URL.createObjectURL(blob);
  openBlobUrlHTML(blobUrl);
  URL.revokeObjectURL(blobUrl);
}

function openBlobUrlHTML(blobUrl) {
  const win = window.open(blobUrl);

  // 'noopener' useful for security, but causes an error if trying to access win.document.
  // const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
  // if ('document' in win) { console.log(win.document.styleSheets); } // DEBUG

  // BUG: Chrome inserts "injected stylesheet" where it sets "font-size: 75%".
  //      We need to either set font-size to 'initial' or '100%' if not set in the body already.
  //      It also sets "font-family".

  // this didn't do anything
  // win.document.body.style.fontSize = '100%';
}


function saveWACZ(blob) {

  console.log('saveWACZ: ', blob); // DEBUG
  const filename = 'test.wacz';
  const file = new File([blob], filename, { type: "application/zip" });
  let blobUrl = URL.createObjectURL(file);
  // open a Save dialog instead of viewing in a window
  window.open(blobUrl);
  URL.revokeObjectURL(blobUrl);
}

// This will open the default page in a local ReplayWeb window.
// https://github.com/webrecorder/replayweb.page
//
function openWACZ({ blob, url = 'page:0', title = '' }) {
  console.log('openWACZ: ', blob); // DEBUG

  let waczBlobUrl = URL.createObjectURL(blob);
  openBlobUrlWACZ({ blobUrl: waczBlobUrl, url, title });
}

function openBlobUrlWACZ({ blobUrl, url = 'page:0', title = '' }) {

  let eUrl = encodeURIComponent(url);
  let openUrl = chrome.runtime.getURL('replay/replay.html') + `?src=${blobUrl}&url=${eUrl}&title=${title}`;
  let win = window.open(openUrl);

  // free blob memory on close
  // TODO Later: free all blobs when closing Dashboard
  win.addEventListener('beforeunload', (event) => {
    console.log(`Free ${waczBlobUrl}`); // DEBUG
    URL.revokeObjectURL(waczBlobUrl);
  });
}

async function onTorrentAdd(torrent) {

  console.log('     torrent: ', torrent); // DEBUG
  if (!torrent) return;

  const orighash = torrent.discovery.infoHash;

  dlog(`        name: ${torrent.name}`);
  dlog(`  infohash A: ${orighash}`);
  dlog(`  infohash B: ${torrent.infoHash}`);

  torrent.on('infoHash', () => {
    dlog('torrent infoHash has been determined.');
  });

  torrent.on('error', (err) => {
    dlog(`torrent error: ${err.message}`);
  });

  torrent.on('warning', (err) => {
    dlog(`torrent warning:  ${err.message}`);
  });

  torrent.on('ready', () => {
    dlog("torrent ready.");
  });

  torrent.on('done', async () => {

    // log list of files in torrent
    let i = 0;
    for (const file of torrent.files) {
      dlog(`      file ${i}: ${file.name}`);
      i++;
    }

    // Download the first file.
    // This assumes the first file is what we are displaying.
    let file1 = torrent.files[0];
    dlog(` downloading: ${file1.name}`);
    let blob = await file1.blob(); // download file
    dlog(`        size: ${blob.size}  type: ${blob.type}`);

    // Since we can't store the torrent directly in the cache (can't serialize value to JSON)
    // we'll store the blob's URL after creating a blob object, which should be freed later.
    let blobUrl = URL.createObjectURL(blob);
    let info = await wtCacheGet(orighash);
    if (info) {
      // add to existing cache entry
      info.blobSize = blob.size;
      info.blobType = blob.type;
      info.blobUrl = blobUrl;
      wtCacheSet(orighash, info);
    }
    else {
      // this shouldn't happen
      dlog("infohash not found in cache!");
    }
  });
}

// Set up port to receive messages from background.js
let bgPort = chrome.runtime.connect({ name: 'wt-port' });
bgPort.onMessage.addListener((msg) => {

  if (!msg) { return }

  if (msg.message === 'wt_fetch') {
    // fetch torrent
    dlog(`Lookup group: ${msg.group}`);
    dlog(`  infohash A: ${msg.infoHash}`);

    if (wtClient) {
      // start downloading a new torrent
      const cOpts = {announce: ["wss://tracker.btorrent.xyz", "wss://tracker.openwebtorrent.com"]};
      wtClient.add(msg.infoHash, cOpts, onTorrentAdd);

    }
    else {
      dlog('ERROR: wtClient is missing!');
    }
  }
  else if (msg.message === 'wt_seed') {
    // seed torrent (NOT READY)

    dlog(`  Seed group: ${msg.group}`);
    dlog(`    infohash: ${msg.infoHash}`);
    dlog(`       tabId: ${msg.tabId}`);

    // TODO
    if (!chrome.pageCapture) {
      console.log("pageCapture not supported!");
    }
    else {
      // grab the contents of the page (Chrome only)
      chrome.pageCapture.saveAsMHTML({ tabId: msg.tabId }, (mhtmlData) => {
        // mhtmlData is an ArrayBuffer
        console.log("Captured Page"); // DEBUG
        dlog("Captured Page");

      /*
        // TEST: Save locally first
        //const blob = new Blob([mhtmlData], { type: "multipart/related" });
        // filename is ignored in Save dialog
        // const filename = msg.infoHash + '.mhtml';
        const filename = 'testpage.mht';
        const blob = new File([mhtmlData], filename, { type: "multipart/related" });

        let blobUrl = URL.createObjectURL(blob);
        // opens a Save dialog instead of viewing in a window
        window.open(blobUrl);
        // window.open(blobUrl, '_blank', 'noopener,noreferrer');
        URL.revokeObjectURL(blobUrl);
      */

        // TODO: remove the following

        // Buffer() is not defined, but only in node.js
        // const img = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

        // create an ArrayBuffer from base64 encoded png image (requires base64.js)

        // Uncaught Error: invalid input type
        const img = base64DecToArr('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7').buffer;

        // Error: Invalid torrent identifier
        //const img = base64DecToArr('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

        img.name = 'img.png';

        // seed torrent
        dlog("Seeding torrent...");
        const seedOpts = {
          dht: false, tracker: false, lsd: false,
          // name: msg.group,
          // infoHash: msg.infoHash,   // TEST
          createdBy: 'CENOtest/1.0'
        };

        // const fileData = new File([mhtmlData], msg.group, { type: "multipart/related" });
        // const torrentId = msg.infoHash;

        // WT ERROR: Invalid torrent identifier
        //wtClient && wtClient.seed(fileData, seedOpts, onTorrentTest);
        //wtClient && wtClient.seed(mhtmlData, seedOpts, onTorrentTest);
        //wtClient && wtClient.seed(img, seedOpts, onTorrentTest);

        // TEST
        /*
        if (wtClient) {
          // supposed to try to download a torrent
          let torrent1 = wtClient.add(torrentId, (torrent) => {
            console.log('torrent2: ', torrent); // DEBUG
          });
          onTorrentTest(torrent1);
        }
        */

        // TEST
        // This sets the infoHash correctly, but how to add files and seed it?
        // According to docs, .add() is supposed to "Start downloading a new torrent"

        // wtClient && wtClient.add(torrentId, seedOpts, onTorrentTest);

        // TODO: How do we set the infoHash ?

        // TODO: may need to call wtClient.createServer()
        // and use service workers

      });

    }
  }

});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) { return }
  if (msg.message === 'wt_view') {
    // view given blob url
    if (msg.type === 'text/html') {
      dlog("Opening HTML in window...");
      openBlobUrlHTML(msg.url);

    }
    else if (msg.type === 'application/octet-stream') {
      dlog("Opening WACZ in window...");
      openBlobUrlWACZ({ blobUrl: msg.url, title: "Website from CENO" });
    }
    else {
      dlog(`Can't View Website: Unknown MIME Type: ${msg.type}`);
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
    if (err) {
      console.error(`WebTorrent client not destroyed! ${err}`);
    }
    else {
      console.log("WebTorrent client closed OK."); // DEBUG
    }
  });

});
