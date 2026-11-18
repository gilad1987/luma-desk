import { defineConfig } from 'vitest/config';
import { swManifestPlugin } from './build/sw-manifest-plugin.ts';

export default defineConfig({
  // Relative asset URLs, so the same build runs from a GitHub Pages sub-path and from the installed PWA.
  base: './',
  plugins: [swManifestPlugin()],
  // Minify the CSS only, with no browser targets. A target makes Lightning CSS add vendor prefixes and lower syntax
  // (`-webkit-backdrop-filter`, the `-webkit-mask-*` longhands) that the original page never shipped, which changes
  // the look in the Safari and Chrome versions that read them.
  build: { cssTarget: false },
  // Answer like GitHub Pages (`Access-Control-Allow-Origin: *`, no `Vary: Origin`). Vite's default CORS answer varies
  // on Origin, so the worker's cached copies never match the page's crossorigin requests and offline boot fails.
  preview: { cors: { origin: '*' } },
  test: {
    // Unit tests live in tests/unit/; Playwright owns tests/e2e/, so Vitest must not pick up those specs.
    include: ['tests/unit/**/*.test.ts'],
    // a `.only` left in a commit would silently skip the rest of the suite
    allowOnly: false,
    // the parity oracles replay thousands of seeded frames; the 5 s default times out on a loaded machine
    testTimeout: 30_000,
  },
});
