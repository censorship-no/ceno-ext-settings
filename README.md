# ouifennec-ext-settings

A WebExtension frontend for the Ouinet HTTP Settings API, and the CENO update page.

We use [web-ext](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Getting_started_with_web-ext) for development.

## Developing

Run `web-ext run` to test in a temporary profile on desktop (with live reload!), and `web-ext run --target=firefox-android` for same on mobile (more details and debugging instructions at [upstream docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Getting_started_with_web-ext#Testing_in_Firefox_for_Android)).

## Distributing

To ship an updated version, update the git submodule in `https://github.com/censorship-no/gecko-dev/tree/ceno/mobile/android/extensions`.
