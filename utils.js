const CENO_ICON = {
  path: {
    32: "icons/ceno-logo-32.png",
    48: "icons/ceno-logo-48.png",
    96: "icons/ceno-logo-96.png",
  },
};

const CENO_PERSONAL_ICON = {
  path: {
    32: "icons/ceno-personal-logo-32.png",
    48: "icons/ceno-personal-logo-48.png",
    96: "icons/ceno-personal-logo-96.png",
  },
};

function setBrowserAction(isPersonal) {
  if (isPersonal) {
    browser.browserAction.setIcon(CENO_PERSONAL_ICON);
  }
  else {
    browser.browserAction.setIcon(CENO_ICON);
  }
}
