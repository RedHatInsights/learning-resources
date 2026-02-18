// Polyfill crypto.randomUUID for jsdom (used by HelpPanelCustomTabs and others)
const crypto = globalThis.crypto ?? {};
if (typeof crypto.randomUUID !== 'function') {
  const { v4: uuidv4 } = require('uuid');
  crypto.randomUUID = function randomUUID() {
    return uuidv4();
  };
  if (globalThis.crypto === undefined) {
    globalThis.crypto = crypto;
  } else {
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: crypto.randomUUID,
      configurable: true,
    });
  }
}

import '@testing-library/jest-dom';
