class State extends Map {
  set (k, v) {
    ((name, newval) => {
      const elt = document.getElementById(name);
      if (elt == null) { return; } // We might not have counterparts for all the things in State in DOM
      elt.children[0].checked = newval;
    })(k, v);
    return super.set(k, v);
  }
}

window.addEventListener("load", () => {
  const form = document.getElementById("myForm");

  let state = new State();

  fetch('http://localhost/api/status')
    .then(x => x.json())
    .then(Object.entries)
    .then(x => x.map(([k,v]) => {
       state.set(k, v);
    }));

  const btns = Array.from(document.getElementById('myForm').getElementsByTagName('input'));
  btns.map(x =>
    x.addEventListener('click', event => {
      const toggled = !state.get(x.name);
      fetch(`http://localhost/?${x.name}=${toggled ? 'enabled' : 'disabled'}`)
        .then(_ => state.set(x.name, toggled))
    })
  );
});
