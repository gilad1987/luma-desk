import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs, so the same build runs from a GitHub Pages sub-path and from the installed PWA.
  base: './',
  test: {
    // Unit tests live in tests/unit/; Playwright owns tests/e2e/, so Vitest must not pick up those specs.
    include: ['tests/unit/**/*.test.ts'],
  },
});
