const STATUS_ENDPOINT = "http://127.0.0.1:8081/api/status";
const SET_VALUE_ENDPOINT = "http://127.0.0.1:8081/";

class State extends Map {
  set (key, value) {
    const elem = document.getElementById(key);
    if (!elem) {
      return; // We might not have counterparts for all the things in State in DOM
    }
    if (elem.type === 'checkbox') {
      elem.disabled = false;
      elem.checked = value;
    } else {
      if (Array.isArray(value)) {
        elem.innerHTML = value.join('<br>');
      } else {
        elem.innerHTML = value;
      }
    }
    return super.set(key, value);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showBrowserInfo(info) {
  document.getElementById('ceno_version').innerHTML = `${info.version} Build ID ${info.buildID}`;
}

function setupButtons(state) {
    const form = document.getElementById("form");
    const buttons = Array.from(form.getElementsByTagName('input'));

    buttons.map(elem =>
      elem.addEventListener('click', event => {
        const name = elem.id;
        const newValue = !state.get(name);
        fetch(SET_VALUE_ENDPOINT + `?${name}=${newValue ? 'enabled' : 'disabled'}`)
          .then(_ => state.set(name, newValue))
      }));
}

function disableCheckboxes(state) {
  for (let [key, value] of state) {
    const elem = document.getElementById(key);
    if (!elem) { return; }
    if (elem.type === 'checkbox') {
      elem.disabled = true;
      return state.super.set(key, value);
    }
  }
}

window.addEventListener("load", async () => {
  document.getElementById('ceno_settings_version').innerHTML = browser.runtime.getManifest().version;
  browser.runtime.getBrowserInfo().then(showBrowserInfo);

  let state = new State();

  setupButtons(state);

  while (true) {
    let response = await fetch(STATUS_ENDPOINT);

    if (response.ok) {
      let json = await response.json();
      Object.entries(json).map(([k,v]) => state.set(k, v))
    } else {
      console.log("Error: " + error);
      document.getElementById('ouinet_version').innerHTML = 'Could not connect to Ouinet';
      disableCheckboxes(state);
    }

    await sleep(5000);
  }

});
