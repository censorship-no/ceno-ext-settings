var openSettingsTab = function() {
  var url = browser.extension.getURL("settings_html");
  browser.tabs.create({url: url});
}
browser.browserAction.onClicked.addListener(openSettingsTab);
