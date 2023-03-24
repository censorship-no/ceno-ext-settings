'use strict';

let loc = new URL(window.location.href);
let src = loc.searchParams.get('src') || '';
let url = loc.searchParams.get('url') || 'page:0';
document.title = loc.searchParams.get('title') || '';
let elem = document.getElementById('custom-replay-id');
elem.setAttribute('src', src);
elem.setAttribute('url', url);
