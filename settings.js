const STATUS_ENDPOINT = "http://127.0.0.1:8078/api/status";
const SET_VALUE_ENDPOINT = "http://127.0.0.1:8078/";

class Button {
  constructor(id) {
    var elem = document.getElementById(id);
    if (!elem) { return; }
    if (elem.type !== 'checkbox') { return; }

    elem.addEventListener('click', event => this.onClick(event));

    this.id = id;
    this.elem = elem;
  }

  set(value) {
    if (!this.elem) return;
    this.elem.disabled = false;
    this.elem.checked = value;
  }

  disable() {
    if (!this.elem) return;
    this.elem.checked = false;
    this.elem.disabled = true;
  }

  onClick(event) {
    if (!this.elem) return;
    const name = this.id;
    const newValue = this.elem.checked;
    fetch(SET_VALUE_ENDPOINT + `?${name}=${newValue ? 'enabled' : 'disabled'}`)
      .then(_ => this.set(newValue))
  }
}

class Text {
  constructor(id) {
    var elem = document.getElementById(id);
    if (!elem) { return; }
    this.elem = elem;
  }

  set(value) {
    if (!this.elem) return;

    if (Array.isArray(value)) {
      this.elem.innerHTML = value.join('<br>');
    } else {
      this.elem.innerHTML = value;
    }
  }

  disable() {
    if (!this.elem) return;
    this.elem.innerHTML = "---";
  }
}

class LogControl {
  constructor(id) {
    var elem = document.getElementById(id);
    if (!elem) { return; }
    if (elem.type !== 'checkbox') { return; }

    elem.addEventListener('click', event => this.onClick(event));

    this.id = id;
    this.elem = elem;
  }

  set(value) {
    if (!this.elem) return;
    this.elem.disabled = false;
    this.elem.checked = value;
  }

  disable() {
    if (!this.elem) return;
    this.elem.checked = false;
    this.elem.disabled = true;
  }

  onClick(event) {
    if (!this.elem) return;
    const name = this.id;
    const newValue = this.elem.checked;
    fetch(SET_VALUE_ENDPOINT + `?${name}=${newValue ? 'enabled' : 'disabled'}`)
      .then(_ => this.set(newValue))
  }
}

class State {
  constructor() {
    this.items = new Map();

    var buttons = ["origin_access", "proxy_access", "injector_access", "distributed_cache"];
    buttons.map(v => this.items.set(v, new Button(v)));

    var texts = ["ouinet_version", "ouinet_build_id", "local_udp_endpoints", "is_upnp_active", "udp_world_reachable"];
    texts.map(v => this.items.set(v, new Text(v)));

    this.setCenoVersion();
    this.setCenoExtensionVersion();

    this.items.set("logfile", new LogControl("logfile"));
  }

  set(key, value) {
    var item = this.items.get(key);
    if (!item) {
      return; // We might not have counterparts for all the things in State in DOM
    }
    item.set(value);
  }

  setCenoVersion() {
    this.ceno_version = new Text("ceno_version");
    browser.runtime.getBrowserInfo().then(info =>
      this.ceno_version.elem.innerHTML = `${info.version} Build ID ${info.buildID}`);
  }

  setCenoExtensionVersion() {
    this.ceno_extension_version = new Text("ceno_extension_version");
    this.ceno_extension_version.elem.innerHTML = browser.runtime.getManifest().version;
  }

  disable() {
    for (let [key, value] of this.items) {
      value.disable();
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

window.addEventListener("load", async () => {
  let state = new State();

  while (true) {
    try {
      let response = await fetch(STATUS_ENDPOINT);

      if (response.ok) {
        let json = await response.json();
        Object.entries(json).map(([k,v]) => state.set(k, v))
      } else {
        console.log("Error: " + error);
        state.disable();
      }
    } catch (err) {
      console.log("Error: " + err.message);
      state.disable();
    }

    await sleep(5000);
  }

});
