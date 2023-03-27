'use strict';

let gBlobUrl = '';
let gBlobSize = '';
let gBlobType = '';

function initSettings() {
  let button = document.getElementById("settings-btn");
  button.addEventListener('click', () => {
    window.open(chrome.runtime.getURL('settings.html'));
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
      console.log("No activeUrl");
    }
  });
}

// Enable the View Website button if torrent found.
function checkTorrentStatus() {

  browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
    if (tabs && tabs[0]) {
      let url = tabs[0].url;
      let group = getDhtGroup(url);
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
          status.innerText = "Searching...";
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
  initViewWebsite();
  checkTorrentStatus();
});
