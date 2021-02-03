
# Handling localization of html files

The web-ext `_locales/` stuff can't be used to localize html files without a bunch of extra javascript work. We can instead use translate-toolkit (`apt install translate-toolkit`) to create `.pot` files and per-language `.po` files and then generate a set of per-language html files for each language based on the `.po` files for that language and the original `.html` files.

Directory structure:

```
i18n/pot/ <-- The .pot files. Not per-language.
i18n/po/<language>/ <-- The per-language .po files
i18n/html/<language>/ <--the per-language html files
```

First, the existing `.html` files stay where they are and are the only ones edited by the developers. The `.pot` files are generated once but can be re-generated if the `.html` files change. They are not per-language. 

Commands to implement this:

```
mkdir i18n
html2po -P . i18n/pot # Generate .pot files
mkdir i18n/po
pot2po -i i18n/pot -t . -o i18n/po/en # generate english po files
```

The last command is repeated for each language with "en" replaced with the language code.

Then the `i18n/po` directory would be two-way synced with weblate such that the `.po` files for each language are automatically updated based on the community translations.

The last is a script that takes the original `.html` files and the per-language `.po` files and generates per-language `.html` files:

```
#!/bin/bash

# Change working directory to script location
cd "$(dirname "$0")"

# Ensure html directory exists
mkdir -p html

# Build english html files
po2html -i po/en -t ../ -o html/en
```

Where the last line would be repeated for each language with the two instances of "en" replaced by the correct language codes.

The script would have to be run every time the `.po` files change. It might be possible to configure Weblate to automatically run this script before it syncs the changed `.po` files to the git repo.

The last step for the `.html` files is to configure the web extension so the correct set of `.html` files are shown to the user based on their language. This is covered in the next section.

# Handling manifest.json and .js files

The built-in `web-ext` API can handle i18n of `manifest.json` and `.js` files. This is handled by defining messages in `_locales/<language>/messages.json` e.g. `_locales/en/messages.json` and then referencing them from the manifest and .js files.

## manifest.json

If a key-value pair a `messages.json` file is e.g: `"foo": "bar"` then this value can be referenced in `manifest.json` using "__MSG_foo". So instead of manifest.json having a line like:

```
"myKey": "foo".
```

you would have a line like:

```
"myKey": "__MSG_foo__"
```

and then the `messages.json` file for each language (in e.g. `_locales/en/messages.json` and `_locales/es/messages.json` would each have different values for the key `"foo"`.

This is all documented here:

https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization

This method can be used to make the name and description of the web extension language-specific, but it can also be used to ensure that the .html files referenced are the correct ones for the current language.

E.g. right now `manifest.json` specifies a "page action" called "CENO" which has the html page "popup.html" like so:

```
"page_action": {
    "default_icon": "icons/ceno-logo-32.png",
    "default_title": "CENO",
    "default_popup": "popup.html"
  },
```

Using the schema explained in the first section of this file there would be a set of generated html pages for each language in `i18n/html` so e.g. `i18n/html/en/popup.html` and `i18n/html/es/popup.html` would exist.

In order to ensure that the user sees the correct html page for their language the above section of `manifest.json` could be re-written like so:

```
"page_action": {
    "default_icon": "icons/ceno-logo-32.png",
    "default_title": "CENO",
    "default_popup": "__MSG_popup_html__"
  },
```

and then in `_locales/en/messages.json` the following line would be added:

```
"popup_html": "i18n/en/popup.html"
```

and in `_locales/es/messages.json` the following line would be added:

```
"popup_html": "i18n/es/popup.html"
```

This would be done for each html page (there are only a few) and language.

## .js files

The web-ext API for i18n in javascript is very simple and is documented here:

https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization

Probably the only relevant call will be `browser.i18n.getMessage("someKey")` which retrieves the value for "someKey" from the `messages.json` file for the current language.

The only string in a .js file currently in need of localization that I could find appears to be in `background.js` in a line that says:

```
 title: "CENO warning"
```

so then in e.g. `_locales/en/messages.json` this line would be added:

```
"cenoWarning": "CENO warning",
```

and the line in `background.js` would be replaced with:

```
 title: browser.i18n.getMessage("cenoWarning");
```
