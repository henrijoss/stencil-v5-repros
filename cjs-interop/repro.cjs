// Loads the CommonJS build in Node with jsdom as the DOM, the way a unit test would.
const { JSDOM } = require('jsdom');

const { window } = new JSDOM('<!DOCTYPE html><html><body><repro-cjs></repro-cjs></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/',
});
globalThis.window = window;
// Node has its own Event classes, jsdom only dispatches its own
const jsdomOnly = ['Event', 'CustomEvent', 'EventTarget'];
for (const key of Object.getOwnPropertyNames(window)) {
  if (!(key in globalThis) || jsdomOnly.includes(key)) {
    globalThis[key] = window[key];
  }
}

const { defineCustomElements } = require('./dist/loader-bundle/loader/index.cjs');

(async () => {
  await defineCustomElements(window);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const shadowRoot = window.document.querySelector('repro-cjs').shadowRoot;
  console.log('shadow root content:', JSON.stringify(shadowRoot ? shadowRoot.innerHTML : null));
  process.exit(shadowRoot && shadowRoot.innerHTML.includes('rendered') ? 0 : 1);
})();
