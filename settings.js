const FRONT_END_BASE = `http://${config.ouinet_client.host}:${config.ouinet_client.front_end.port}`;
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

class StyleSelector {
  constructor(id) {
    var elem = document.getElementById(id);
    if (!elem) { return; }
    if (elem.type !== 'button') { return; }

    elem.addEventListener('click', event => this.onClick(event));

    this.id = id;
    this.elem = elem;
    this.cb = null;
  }

  onClick(event) {
    if (!this.elem) return;
    setStyle(this.id)
    browser.storage.local.set({
      style: this.id
    });
  }
}

class ModeSelector {
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
    setSelectedMode(this.id)
    if (!this.elem) return;
    browser.storage.local.set({
      mode: this.id
    });
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

    var modes = ["public", "personal"];
    modes.map(v => this.actions.push(new ModeSelector(v)));

    var selectors = ["small_style", "med_style", "big_style"];
    selectors.map(v => new StyleSelector(v));

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
    browser.runtime.getBrowserInfo().then(info =>
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

const smallStyle = {
  headerHeight: "60px",
  fontSize: "1em",
  formPadding: "25px",
  rowHeight: "25px",
  cbPadding: "25px",
  cbTop: "4px",
  cbSize: "15px",
  cbBorder: "#aaa solid 2px",
  cbBorderRadius: "5px",
  smallBtnBorder: "#0ea5e9",
  medBtnBorder: "#aaa",
  bigBtnBorder: "#aaa"
};

const mediumStyle = {
  headerHeight: "80px",
  fontSize: "2em",
  formPadding: "37.5px",
  rowHeight: "50px",
  cbPadding: "50px",
  cbTop: "10px",
  cbSize: "30px",
  cbBorder: "#aaa solid 4px",
  cbBorderRadius: "10px",
  smallBtnBorder: "#aaa",
  medBtnBorder: "#0ea5e9",
  bigBtnBorder: "#aaa"
};

const bigStyle = {
  headerHeight: "120px",
  fontSize: "3em",
  formPadding: "50px",
  rowHeight: "80px",
  cbPadding: "80px",
  cbTop: "16px",
  cbSize: "40px",
  cbBorder: "#aaa solid 5px",
  cbBorderRadius: "15px",
  smallBtnBorder: "#aaa",
  medBtnBorder: "#aaa",
  bigBtnBorder: "#0ea5e9",
};

function setStyle(size) {
  if (size == null)
    return;

  var style = {};
  if (size == "small_style") {
    style = smallStyle;
  }
  else if (size == "med_style") {
    style = mediumStyle;
  }
  else if (size == "big_style") {
    style = bigStyle;
  }

  const h = document.getElementById('header');
  h.style.height = style.headerHeight;
  h.style.lineHeight = style.headerHeight;
  h.style.paddingLeft = style.formPadding;
  h.style.fontSize = style.fontSize;

  const radios = document.querySelectorAll('.rd_form');
  Array.from(radios).map(f => {
    f.style.fontSize = style.fontSize;
  });

  const rd_rows = document.querySelectorAll('.rd_form .row');
  Array.from(rd_rows).map(r => {
    r.style.height = style.rowHeight;
    r.style.lineHeight = style.rowHeight;
  });

  const rd_checkboxs = document.querySelectorAll('.rd_checkmark');
  Array.from(rd_checkboxs).map(cb => {
    cb.style.height = style.cbSize;
    cb.style.width = style.cbSize;
    cb.style.border = style.cbBorder;
  });

  const forms = document.querySelectorAll('.cb_form');
  Array.from(forms).map(f => {
    f.style.fontSize = style.fontSize;
    f.style.padding = style.formPadding;
  });

  const rows = document.querySelectorAll('.cb_form .row');
  Array.from(rows).map(r => {
    r.style.height = style.rowHeight;
    r.style.lineHeight = style.rowHeight;
  });

  const containers = document.querySelectorAll('.cb_container');
  // TODO: account for bi-directional i18n
  Array.from(containers).map(c => c.style.paddingLeft = style.cbPadding);

  const checkboxs = document.querySelectorAll('.checkmark');
  Array.from(checkboxs).map(cb => {
    cb.style.top = style.cbTop;
    cb.style.height = style.cbSize;
    cb.style.width = style.cbSize;
    cb.style.border = style.cbBorder;
    cb.style.borderRadius = style.cbBorderRadius;
  });

  const items = document.querySelectorAll('.status_items');
  Array.from(items).map(f => {
    f.style.fontSize = style.fontSize;
    f.style.padding = style.formPadding;
  });

  const smallBtn = document.querySelector('.btn_small');
  smallBtn.style.borderColor = style.smallBtnBorder
  const mediumBtn = document.querySelector('.btn_med');
  mediumBtn.style.borderColor = style.medBtnBorder
  const bigBtn = document.querySelector('.btn_big');
  bigBtn.style.borderColor = style.bigBtnBorder
}

function setSelectedMode(mode) {
  const publicBtn = document.getElementById('public');
  const personalBtn = document.getElementById('personal');
  publicBtn.style.borderColor = (mode == "personal" ? "#aaa" : "#0ea5e9");
  personalBtn.style.borderColor = (mode == "personal" ? "#0ea5e9" : "#aaa");
}

window.addEventListener("load", async () => {
  setFrontEndLinks();

  browser.storage.local.get("style").then(item => setStyle(item.style));
  browser.storage.local.get("mode").then(item => setSelectedMode(item.mode));

  let state = new State();

  while (true) {
    try {
      let response = await fetch(STATUS_ENDPOINT);

      if (response.ok) {
        let json = await response.json();
        Object.entries(json).map(([k,v]) => state.set(k, v))
        state.enable();
      } else {
        console.error("Failed to parse client status JSON:", error);
        state.disable();
      }
    } catch (err) {
      console.error("Failed to fetch client status JSON:", err);
      state.disable();
    }

    await sleep(5000);
  }

});
