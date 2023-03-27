'use strict';

const WT_CACHE_EXPIRES_AFTER = 1000 * 60; // in millisecs = 1 min

// --- General ------------------------------------------------------------

function getBrowser() {
  // The order these are in is important
  if (navigator.brave) { return 'brave' }
  else if (navigator.userAgent.indexOf('Edg') !== -1) { return 'edge' }
  else if (navigator.userAgent.indexOf('OPR') !== -1) { return 'opera' }
  else if (navigator.userAgent.indexOf('Firefox') !== -1) { return 'firefox' }
  else if (navigator.userAgent.indexOf('Chromium') !== -1) { return 'chromium' }
  else if (navigator.userAgent.indexOf('Chrome') !== -1) { return 'chrome' }
  else if (navigator.userAgent.indexOf('Safari') !== -1) { return 'safari' }
  else if ((navigator.userAgent.indexOf('Trident') !== -1) || (navigator.userAgent.indexOf('MSIE'))) { return 'ie' }
  else { return '' }
}

// Given url string, return true if it is a valid http or https URL.
function isWebUrl(url) {
  return ((typeof url) === 'string' && (url.indexOf('http://') === 0 || url.indexOf('https://') === 0));
}

function removeFragmentFromURL(url) {
    return url.replace(/#.*$/, "");
}

function removeSchemeFromURL(url) {
    return url.replace(/^[a-z][-+.0-9a-z]*:\/\//i, "");
}

function removeTrailingSlashes(s) {
    return s.replace(/\/+$/, "");
}

function removeLeadingWWW(s) {
    return s.replace(/^www\./i, "");
}

// --- WebTorrent ------------------------------------------------------------

function getDhtGroup(url) {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onBeforeSendHeaders
    if (!(url && (typeof url === 'string'))) return url;
    url = removeFragmentFromURL(url);
    url = removeSchemeFromURL(url);
    url = removeTrailingSlashes(url);
    url = removeLeadingWWW(url);
    return url;
}

function getSwarm(group) {
  const OUI_PROTO = "6";
  const INJ_PUBKEY = "zh6ylt6dghu6swhhje2j66icmjnonv53tstxxvj6acu64sc62fnq";
  let swarm = `ed25519:${INJ_PUBKEY}/v${OUI_PROTO}/uri/${group}`;
  return swarm;
}

// Return hex string of SHA-1 hash of swarm.
async function getInfoHash(swarm) {
  if (crypto && ('subtle' in crypto)) {
    // only works in secure contexts
    const encoder = new TextEncoder();
    const data = encoder.encode(swarm);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
  else {
    console.warn("Can't use crypto in insecure context!");
  }
}

// --- WebTorrent Cache ------------------------------------------------------------

// Insert info into the WT cache.
function wtCacheSet(key, info) {
  browser.storage.local.get('wt_cache').then((data) => {
    if (!data.wt_cache) {
      data.wt_cache = {};
    }
    if (!info) {
      info = {};
    }
    info.updated = Date.now();
    data.wt_cache[key] = info;
    browser.storage.local.set(data);
  });
}

// Retrieve object if key is in the WT cache. Returns a Promise.
function wtCacheGet(key) {
  return new Promise((resolve, reject) => {
    browser.storage.local.get('wt_cache').then((data) => {
      if (data.wt_cache && data.wt_cache[key]) {
        resolve(data.wt_cache[key]);
      }
      else {
        resolve(null);
      }
    });
  });
}

// Remove single item from WT cache. Returns a Promise.
function wtCacheRemove(key) {
  return browser.storage.local.get('wt_cache').then((data) => {
    if (data.wt_cache && data.wt_cache[key]) {
      delete data.wt_cache[key];
    }
    return browser.storage.local.set(data);
  });
}

// Clears the entire WT cache. Returns a Promise.
function wtCacheRemoveAll() {
  return browser.storage.local.get('wt_cache').then((data) => {
    if (data.wt_cache) {
      delete data.wt_cache;
    }
    return browser.storage.local.set(data);
  });
}

// Removes all items in the WT cache that are older than given millisecs from now. Returns a Promise.
function wtCacheRemoveAllExpired(millisecs = WT_CACHE_EXPIRES_AFTER) {
  return browser.storage.local.get('wt_cache').then((data) => {
    if (data.wt_cache) {
      const now = Date.now();
      for (let [k, v] of Object.entries(data.wt_cache)) {
        if (v.updated && (((now - v.updated) > millisecs))) {
          delete data.wt_cache[k];
          console.log("deleted: " + k); // DEBUG
        }
      }
    }
    return browser.storage.local.set(data);
  });
}

// --- Proxy ------------------------------------------------------------

/**
 * Configure the Ouinet client as a proxy.
 *
 * As of 2022-02-22, and according
 * to @url{https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/proxy/settings},
 * this only works on Desktop Firefox >= 60.
 * It now also works in Chrome.
 * Proxy settings persist after browser close whenever extension is running.
 */
function setOuinetClientAsProxy({config, reset = false }) {

  if (!config) { config = APP_CONFIG; } // doesn't work in function params
  if (reset) {
    chrome.proxy.settings.clear({ scope: 'regular' }, () => {
      console.log("Proxy reset.");
    });
    return;
  }

  // The proxy API is different on Firefox and Chrome, but there is no
  // reliable way to detect which one we are working with, so instead
  // we check what browser is being used.
  let whatBrowser = getBrowser();
  console.log(`Setting up proxy on ${whatBrowser}...`);

  switch (whatBrowser) {
    case 'chrome': {
      // set up the proxy
      chrome.proxy.settings.set({ scope: 'regular', value: {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            host: config.ouinet_client.host,
            port: config.ouinet_client.proxy.port
          },
          bypassList: ['<local>']
        }
      }}, () => {
        console.log("Ouinet client proxy configured.");
      });
      break;
    }
    case 'firefox': {
      // On Firefox we can only config proxy settings when private access is true.
      // On Chrome setting proxy will still work without incognito access.
      let isAllowed = browser.extension.isAllowedIncognitoAccess();
      isAllowed.then((allowed) => {
        if (allowed) {
          // set up the proxy
          let proxyEndpoint = `${config.ouinet_client.host}:${config.ouinet_client.proxy.port}`;
          let proxySettings = {
            proxyType: "manual",
            http: proxyEndpoint,
            ssl: proxyEndpoint,
          };
          browser.proxy.settings.set({ value: proxySettings }).then(function() {
            console.log("Ouinet client proxy configured.");
          }).catch(function(e) {
            // This does not work on Android:
            // check occurrences of "proxy.settings is not supported on android"
            // in `gecko-dev/toolkit/components/extensions/parent/ext-proxy.js`.
            console.error("Failed to configure proxy: ", e);
          });
        }
        else {
          console.error("CENO Extension needs private access to set up proxy!");
          console.log("Go to 'about:addons', click on 'CENO Extension', under Details set 'Run in Private Windows' to Allow.");
        }
      });
      break;
    }
    default:
      console.error(`Ouinet client is not yet supported on ${whatBrowser}.`);
  }
}
