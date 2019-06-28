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
      elem.innerHTML = value;
    }
    return super.set(key, value);
  }
}

function showBrowserInfo(info) {
  document.getElementById('ceno_version').innerHTML = `${info.version} Build ID ${info.buildID}`;
}

window.addEventListener("load", () => {
  document.getElementById('ceno_settings_version').innerHTML = browser.runtime.getManifest().version;
  browser.runtime.getBrowserInfo().then(showBrowserInfo);

  let state = new State();
  fetch(STATUS_ENDPOINT)
    .then(response => {
      if (!response.ok) {
        throw new Error(response.statusText)
      }
      return response.json();
    })
    .then(json => Object.entries(json).map(([k,v]) => state.set(k, v)))
    .catch(error => {
      console.log("Error: " + error);
      document.getElementById('ouinet_version').innerHTML = 'Could not connect to Ouinet';
    });

  const form = document.getElementById("form");
  const buttons = Array.from(form.getElementsByTagName('input'));

  buttons.map(elem =>
    elem.addEventListener('click', event => {
      const name = elem.id;
      const newValue = !state.get(name);
      fetch(SET_VALUE_ENDPOINT + `?${name}=${newValue ? 'enabled' : 'disabled'}`)
        .then(_ => state.set(name, newValue))
    })
  );
});
