/** The split position a fresh fake panel starts at, as the markup's `position="50"` gives the real one. */
const START_PERCENT = 50;

/**
 * Defines `wa-split-panel` in the jsdom page as an element with a numeric `position`, the one member `CentreSplit`
 * needs from the upgraded Web Awesome panel; without it `CentreSplit` refuses the bare tag on purpose. Call it before
 * the markup is put into a connected element, so jsdom upgrades the panel on insertion as a browser does. Safe to
 * call in every test: a second call keeps the first definition.
 */
export function defineFakeSplitPanel(): void {
  if (customElements.get('wa-split-panel')) return;
  customElements.define(
    'wa-split-panel',
    class extends HTMLElement {
      position = START_PERCENT;
    },
  );
}
