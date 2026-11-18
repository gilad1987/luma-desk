/**
 * The only file that imports Web Awesome (docs/adr/0006). The components and their theme are bundled from the pinned
 * npm package, never loaded from a CDN, so the builder works offline from the service worker's cache. The app loads
 * this module with a dynamic `import()` on the first Build Stage click, so it is the chunk boundary: the desk's main
 * chunk stays free of Web Awesome. Only these five components are registered; `webawesome.css`, `native.css` and
 * `utilities.css` are left out on purpose, because they restyle the whole page and not only the builder.
 */
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/button-group/button-group.js';
import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js';
import '@awesome.me/webawesome/dist/components/split-panel/split-panel.js';
import '@awesome.me/webawesome/dist/components/drawer/drawer.js';
import '@awesome.me/webawesome/dist/styles/themes/default.css';

/** The custom elements the imports above define; the builder markup may use only these. */
export const WA_TAGS = ['wa-button', 'wa-button-group', 'wa-tooltip', 'wa-split-panel', 'wa-drawer'] as const;

/**
 * Resolves when every tag in {@link WA_TAGS} is defined, so the builder screen mounts upgraded elements and never
 * shows a bare, unstyled tag for one frame.
 */
export async function whenWaReady(): Promise<void> {
  await Promise.all(WA_TAGS.map((tag) => customElements.whenDefined(tag)));
}
