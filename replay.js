'use strict';

let url = new URL(window.location.href);
let src = url.searchParams.get('src') || '';
console.log(src); // DEBUG
let elem = document.getElementById('custom-replay-id');
elem.setAttribute('src', src);
