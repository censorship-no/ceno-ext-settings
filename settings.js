const FRONT_END_BASE = `http://${APP_CONFIG.ouinet_client.host}:${APP_CONFIG.ouinet_client.front_end.port}`;
const STATUS_ENDPOINT = FRONT_END_BASE + "/api/status";
const SET_VALUE_ENDPOINT = FRONT_END_BASE + "/";

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

    if (!Array.isArray(value)) {
      this.elem.textContent = value;
      return;
    }

    // `ParentNode.replaceChildren` requires a recent browser,
    // so construct a new element with same tag and id,
    // then replace the one we have.
    var newElem = document.createElement(this.elem.tagName);
    newElem.id = this.elem.id;

    var first = true;
    for (var i in value) {
      if (!first) { newElem.appendChild(document.createElement("br")); }
      newElem.appendChild(document.createTextNode(value[i]));
      first = false;
    }

    this.elem.replaceWith(newElem);
    this.elem = newElem;
  }

  disable() {
    if (!this.elem) return;
    this.elem.textContent = "---";
  }
}

class DataSizeText extends Text {
  constructor(id) {
    super(id);
  }

  set(value) {
    var b = Number(value);
    if (isNaN(b) || b < 1024) {
      super.set(b + " B");
      return;
    }
    // See <https://stackoverflow.com/a/42408230>.
    var i = Math.floor(Math.log2(b) / 10);
    var v = b / Math.pow(1024, i);
    var u = "KMGTPEZY"[i-1] + "iB";
    super.set(`${v.toFixed(2)} ${u}`);
  }
}

class TextInput extends Text {
  constructor(id, separator=" ") {
    super(id);
    this.id = id;
    this.separator = separator;
    this.button = document.getElementById("save-" + id);
    this.savedHint = document.getElementById("saved-" + id);

    this.elem.form.addEventListener('submit', event => {
      this.doSave();
      event.preventDefault();
    });
    this.button.addEventListener('click', event => this.doSave());
  }

  set(value) {
    if (!this.elem) return;
    this.savedHint.style.display = "none";

    // Do not refresh a field which is being edited.
    if (document.activeElement === this.elem) return;

    this.elem.value = Array.isArray(value)
      ? value.join(this.separator)
      : value;

    this.elem.disabled = false;
    this.button.disabled = false;
  }

  disable() {
    if (!this.elem) return;
    this.elem.value = "";
    this.elem.disabled = true;
    this.button.disabled = true;
  }

  doSave() {
    if (!this.elem) return;
    const name = this.id;
    const newValue = this.elem.value.replace(/ /g, "+");
    fetch(SET_VALUE_ENDPOINT + `?${name}=${newValue}`)
      .then(_ => { this.savedHint.style.display = ""; })  // until next refresh
    ;
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
                 "state", "local_udp_endpoints", "external_udp_endpoints", "public_udp_endpoints",
                 "is_upnp_active", "udp_world_reachable"];
    texts.map(v => this.items.set(v, new Text(v)));

    var dsizes = ["local_cache_size"]
    dsizes.map(v => this.items.set(v, new DataSizeText(v)));

    var text_inputs_sp = ["bt_extra_bootstraps"]
    text_inputs_sp.map(v => this.items.set(v, new TextInput(v, " ")));

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
    // TODO: getBrowserInfo is only supported on Firefox, need alternative for Chrome!
    browser.runtime.getBrowserInfo && browser.runtime.getBrowserInfo().then(info =>
      this.ceno_version.elem.textContent = `${info.version} Build ID ${info.buildID}`);
  }

  setCenoExtensionVersion() {
    this.ceno_extension_version = new Text("ceno_extension_version");
    this.ceno_extension_version.elem.textContent = browser.runtime.getManifest().version;
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

function setFrontEndLinks() {
  for (const [id, path] of [ ["fe-link-cache-list", "/groups.txt"],
                             ["fe-link-log-file", "/logfile.txt"],
                           ]) {
    var elem = document.getElementById(id);
    if (!elem) continue;
    elem.href = FRONT_END_BASE + path;
  }
}

// TODO: clear Webtorrent setting when dashboard window closed (do in dashboard.js ?)
function setupWebtorrent() {
  let elem = document.getElementById('webtorrent_transport');
  if (!elem) { return }
  elem.addEventListener('change', (event) => {
    if (elem.checked) {
      // turn off proxy first
      let proxy_elem = document.getElementById('proxy_transport');
      if (proxy_elem && (proxy_elem.checked === true)) { proxy_elem.click() }
      // open webtorrent dashboard
      let url = browser.runtime.getURL('dashboard.html');
      browser.windows.create({ url: url, width: 800, height: 600, type: 'popup' }).then((win) => {
        browser.storage.local.set({ dashboardId: win.id });
      })
    } else {
      // close webtorrent dashboard
      browser.storage.local.get('dashboardId').then((data) => {
        if (data.dashboardId) {
          browser.windows.remove(data.dashboardId).catch((err) => {
            // need this catch to prevent log error
          });
        }
      });
    }
  });
}

function setupProxy() {
  let elem = document.getElementById('proxy_transport');
  if (!elem) { return }
  elem.addEventListener('change', (event) => {
    let state = new State();
    if (elem.checked) {
      // close webtorrent dashboard first
      let wt_elem = document.getElementById('webtorrent_transport');
      if (wt_elem && (wt_elem.checked === true)) { wt_elem.click() }
      // turn on proxy
      setOuinetClientAsProxy({ config: APP_CONFIG });
      checkProxy(state);
    } else {
      // turn off proxy
      setOuinetClientAsProxy({ reset: true });
      state.disable();
    }
  });
}

async function checkProxy(state) {
  try {
    let response = await fetch(STATUS_ENDPOINT);
    if (response.ok) {
      let json = await response.json();
      Object.entries(json).map(([k,v]) => state.set(k, v))
      state.enable();
    } else {
      console.log("Failed to parse client status JSON:", error);
      state.disable();
    }
  } catch (err) {
    console.log("Failed to fetch client status JSON:", err);
    state.disable();
  }
}

// main onload
window.addEventListener("load", async () => {

  setFrontEndLinks();
  setupWebtorrent();
  setupProxy();

  /*
  let state = new State();
  while (true) {
    checkProxy(state);
    await sleep(5000);
  }
  */
});
