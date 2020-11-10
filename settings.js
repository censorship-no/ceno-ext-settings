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
    this.cb = null;
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
    if (this.cb) this.cb(newValue);
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

class DataSizeText extends Text {
  constructor(id) {
    super(id);
  }

  set(value) {
    var b = Number(value);
    if (isNaN(b) || b < 1024) {
      super.set(b + "&nbsp;B");
      return;
    }
    // See <https://stackoverflow.com/a/42408230>.
    var i = Math.floor(Math.log2(b) / 10);
    var v = b / Math.pow(1024, i);
    var u = "KMGTPEZY"[i-1] + "iB";
    super.set(`${v.toFixed(2)}&nbsp;${u}`);
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

class Action {
  constructor(id) {
    var elem = document.getElementById(id);
    if (!elem) { return; }
    if (elem.type !== 'button') { return; }

    elem.addEventListener('click', event => this.onClick(event));

    this.id = id;
    this.elem = elem;
  }

  enable() {
    if (!this.elem) return;
    this.elem.disabled = false;
  }

  disable() {
    if (!this.elem) return;
    this.elem.disabled = true;
  }

  onClick(event) {
    if (!this.elem) return;
    const name = this.id;
    fetch(SET_VALUE_ENDPOINT + `?${name}=do`);
    this.disable();
  }
}

function someEnabled(ids) {
  return ids.reduce((r, i) => (r || document.getElementById(i).checked), false);
}

function displayIfNoneEnabled(idTarget, idSources) {
  var target = document.getElementById(idTarget);
  if (!target) { return; }
  target.style.display = someEnabled(idSources) ? "none" : "block";
}

class State {
  constructor() {
    this.items = new Map();
    this.actions = new Array();

    var buttons = ["origin_access", "proxy_access", "injector_access", "distributed_cache"];
    buttons.map(v => this.items.set(v, new Button(v)));

    var modeWarningGroups = [
      ["am-warning-private", ["origin_access", "proxy_access"]],
      ["am-warning-public", ["origin_access", "injector_access", "distributed_cache"]],
    ];
    this.modeWarningChecks = [];
    modeWarningGroups.forEach(([idt, idss]) => {
      var check = () => displayIfNoneEnabled(idt, idss);  // check options for browsing mode
      this.modeWarningChecks.push(check);
      idss.forEach(id => {
        var it = this.items.get(id);
        var cb = it.cb;  // to call previous check if existing
        it.cb = cb ? (v => { cb(v); check(); }) : (_ => check());
      });
    });

    var texts = ["ouinet_version", "ouinet_build_id", "ouinet_protocol",
                 "local_udp_endpoints", "is_upnp_active", "udp_world_reachable"];
    texts.map(v => this.items.set(v, new Text(v)));

    var dsizes = ["local_cache_size"]
    dsizes.map(v => this.items.set(v, new DataSizeText(v)));

    this.setCenoVersion();
    this.setCenoExtensionVersion();

    this.items.set("logfile", new LogControl("logfile"));

    this.actions.push(new Action("purge_cache"));
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

  enable() {
    var warnings = document.getElementById("am-warnings");
    if (warnings) {
      warnings.style.display = "block";
      this.modeWarningChecks.forEach(check => check());
    }

    this.actions.forEach(a => a.enable());
  }

  disable() {
    var warnings = document.getElementById("am-warnings");
    if (warnings) { warnings.style.display = "none"; }

    this.items.forEach(v => v.disable());
    this.actions.forEach(a => a.disable());
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
        state.enable();
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
