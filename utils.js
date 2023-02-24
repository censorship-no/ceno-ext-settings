'use strict';

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
        } else {
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
