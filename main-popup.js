'use strict';

let gActiveUrl = '';
let gBlobUrl = '';
let gBlobSize = '';
let gBlobType = '';

function initSettings() {
  let button = document.getElementById("settings-btn");
  button.addEventListener('click', () => {
    window.open(chrome.runtime.getURL('settings.html'));
  });
}

function initFetch() {
  let button = document.getElementById("fetch-btn");
  button.addEventListener('click', () => {
    if (gActiveUrl) {
      // send to dashboard
      browser.runtime.sendMessage({ message: 'wt_fetch2', url: gActiveUrl });
      let status = document.getElementById("status-text");
      status.innerText = "Fetching...";
    }
    else {
      console.log("No activeUrl");
    }
  });
}

function initViewWebsite() {
  let button = document.getElementById("view-website-btn");
  button.addEventListener('click', () => {
    if (gBlobUrl) {
      // send to dashboard
      browser.runtime.sendMessage({ message: 'wt_view', url: gBlobUrl, size: gBlobSize, type: gBlobType });
    }
    else {
      console.log("No blobUrl");
    }
  });
}

// Enable the View Website button if torrent found.
function checkTorrentStatus() {

  browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
    if (tabs && tabs[0]) {
      gActiveUrl = tabs[0].url;
      let group = getDhtGroup(gActiveUrl);
      let swarm = getSwarm(group);
      let ihash = await getInfoHash(swarm);
      let info = await wtCacheGet(ihash);
      let status = document.getElementById("status-text");

      if (info) {
        // in cache
        if ('blobUrl' in info) {
          gBlobUrl = info.blobUrl;
          gBlobSize = info.blobSize;
          gBlobType = info.blobType;

          status.innerText = "Website Found";
          let button = document.getElementById("view-website-btn");
          button.disabled = false;
        }
        else {
          status.innerText = "Fetching...";
        }
      }
      else {
        status.innerText = "";
      }
    }
  });
}

// main onload
window.addEventListener('load', () => {
  initSettings();
  initFetch();
  initViewWebsite();
  checkTorrentStatus();
});
