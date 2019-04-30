# ouifennec-ext-settings

A WebExtension frontend for ouinet HTTP Settings API.

We use [web-ext](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Getting_started_with_web-ext) for development.

## Building

```sh
web-ext build
```

## Testing
Opens Firefox and installs the extension. 
```sh
web-ext run
```

## Distributing

To ship an updated version, one should bump version, sign the addon, and, optionally, push to the distribution file.

Assuming you're in the addon developers group on AMO, grab your API keys from <https://addons.mozilla.org/en-US/developers/addon/api/key/> and set environment variables `$WEB_EXT_API_KEY` and `$WEB_EXT_API_SECRET` for user and secret respectively.

Then, 
```sh
web-ext sign --api-key=$WEB_EXT_API_KEY --api-secret=$WEB_EXT_API_SECRET
```

To push to the distribution file, just replace the xpi there with a new one: `cp ./web-ext-artifacts/ceno_settings-1.0.1-an+fx.xpi ../ouifennec-distribution/assets/distribution/extensions/settings.ceno\@equalit.ie.xpi`.
