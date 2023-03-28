'use strict';

import WebTorrent from './libs/webtorrent.js';

const DEFAULT_TRACKERS = ["wss://tracker.btorrent.xyz", "wss://tracker.openwebtorrent.com"];
let gCurrentTrackers = DEFAULT_TRACKERS;
let wtClient;
let gTimeTests = {}; // key is infohash, value is object of keys { t1, t2, t3 } values of Date()

function dlog(text) {
  const elem = document.getElementById('log-area');
  elem.innerHTML += `${text}\n`;
  elem.scrollTop = elem.scrollHeight;
  console.log(text);
}

function initTrackersInput() {
  let input = document.getElementById("trackers-input");
  input.value = gCurrentTrackers.join(' ');
  input.addEventListener('change', () => {
    gCurrentTrackers = input.value.split(' ');
    dlog(`Trackers changed to: ${gCurrentTrackers}`);
  });
}

function initResetTrackers() {
  let input = document.getElementById("trackers-input");
  let button = document.getElementById("reset-trackers-btn");
  button.addEventListener('click', () => {
    gCurrentTrackers = DEFAULT_TRACKERS;
    input.value = gCurrentTrackers.join(' ');
    dlog(`Trackers changed to: ${gCurrentTrackers}`);
  });
}

function initClearCache() {
  let button = document.getElementById("clear-cache-btn");
  button.addEventListener('click', () => {
    wtCacheRemoveAllExpired(0).then(() => { dlog("Cache cleared.") });
  });
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

function openInWindow(url) {
  return window.open(url, "_blank", "popup,noopener,noreferrer");
}

// Open Blob of HTML in a new tab or window.
function openHTML(blob) {

  console.log('openHTML: ', blob); // DEBUG

  let blobUrl = URL.createObjectURL(blob);
  openBlobUrlHTML(blobUrl);
  URL.revokeObjectURL(blobUrl);
}

function openBlobUrlHTML(blobUrl) {
  openInWindow(blobUrl);

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
  openInWindow(blobUrl);
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
  let win = openInWindow(openUrl);

  // free blob memory on close
  // TODO Later: free all blobs when closing Dashboard
  win && win.addEventListener('beforeunload', (event) => {
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
    dlog('Torrent infoHash has been determined.');
  });

  torrent.on('error', (err) => {
    dlog(`Torrent error: ${err.message}`);
  });

  torrent.on('warning', (err) => {
    dlog(`Torrent warning:  ${err.message}`);
  });

  torrent.on('ready', () => {
    dlog("Torrent ready.");
  });

  torrent.on('done', async () => {
    dlog("Torrent fetched.");

    const t2 = new Date();
    dlog(`        time: ${t2}`);
    if (gTimeTests[orighash] && gTimeTests[orighash].t1) {
      gTimeTests[orighash].t2 = t2;
      let tdiff1 = (t2 - gTimeTests[orighash].t1) / 1000;
      dlog(`        span: ${tdiff1} secs`);
    }

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
    const t3 = new Date();
    const tdiff2 = (t3 - t2) / 1000;
    dlog("File downloaded.");
    dlog(`        size: ${blob.size}  type: ${blob.type}`);
    dlog(`        time: ${t3}`);
    dlog(`        span: ${tdiff2} secs`);
    if (gTimeTests[orighash]) { gTimeTests[orighash].t3 = t3 }

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

function fetchTorrent(infohash) {

  if (wtClient) {
    // start downloading a new torrent
    const t1 = new Date();
    gTimeTests[infohash] = { t1 };
    dlog(`    trackers: ${gCurrentTrackers}`);
    dlog(`       start: ${t1}`);
    const cOpts = {announce: gCurrentTrackers};
    wtClient.add(infohash, cOpts, onTorrentAdd);
  }
  else {
    dlog('ERROR: wtClient is missing!');
  }
}

// Set up port to receive messages from background.js
let bgPort = chrome.runtime.connect({ name: 'wt-port' });
bgPort.onMessage.addListener((msg) => {

  if (!msg) { return }

  if (msg.message === 'wt_fetch') {
    // fetch torrent
    dlog(`Lookup group: ${msg.group}`);
    dlog(`  infohash A: ${msg.infoHash}`);
    fetchTorrent(msg.infoHash);
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

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (!(msg && ('message' in msg))) { return }
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
  else if (msg.message === 'wt_fetch2') {
    if ('url' in msg) {
      // fetch torrent
      // await wtCacheRemoveAllExpired();
      let group = getDhtGroup(msg.url);
      let swarm = getSwarm(group);
      let ihash = await getInfoHash(swarm);
      let info = await wtCacheGet(ihash);
      if (info) {
        dlog(`    In cache: ${group}`);
      }
      else {
        // not in cache
        dlog(`Lookup group: ${group}`);
        dlog(`  infohash A: ${ihash}`);
        wtCacheSet(ihash, { group, swarm });
        fetchTorrent(ihash);
      }
    }
  }
});

// main onload
window.addEventListener('load', async () => {
  initWebtorrent();
  initTrackersInput();
  initResetTrackers();
  initClearCache();
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
