class State extends Map {
  set (key, value) {
    const elem = document.getElementById(key);
    if (!elem) {
      return; // We might not have counterparts for all the things in State in DOM
    }
    elem.checked = value;
    return super.set(key, value);
  }
}

window.addEventListener("load", () => {
  let state = new State();

  fetch('http://127.0.0.1:8081/api/status')
    .then(x => x.json())
    .then(Object.entries)
    .then(x => x.map(([k,v]) => {
      state.set(k, v);
    }));

  const form = document.getElementById("form");
  const buttons = Array.from(form.getElementsByTagName('input'));

  buttons.map(elem =>
    elem.addEventListener('click', event => {
      const name = elem.id;
      const newValue = !state.get(name);
      fetch(`http://127.0.0.1:8081/?${name}=${newValue ? 'enabled' : 'disabled'}`)
        .then(_ => state.set(name, newValue))
    })
  );
});
