import { defineConfig } from 'vitest/config';
import { swManifestPlugin } from './build/sw-manifest-plugin.ts';

export default defineConfig({
  // Relative asset URLs, so the same build runs from a GitHub Pages sub-path and from the installed PWA.
  base: './',
  plugins: [swManifestPlugin()],
  // Answer like GitHub Pages (`Access-Control-Allow-Origin: *`, no `Vary: Origin`). Vite's default CORS answer varies
  // on Origin, so the worker's cached copies never match the page's crossorigin requests and offline boot fails.
  preview: { cors: { origin: '*' } },
  test: {
    // Unit tests live in tests/unit/; Playwright owns tests/e2e/, so Vitest must not pick up those specs.
    include: ['tests/unit/**/*.test.ts'],
  },
});
