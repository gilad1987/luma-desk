import { defineConfig } from '@playwright/test';

// The suite runs against the production build, so it checks what ships. BASE_URL and WEB_SERVER_CMD point it at
// another server, for example BASE_URL=http://127.0.0.1:5173/ WEB_SERVER_CMD="npm run dev -- --port 5173 --strictPort".
const PORT = 4173;
// page.goto('./?test') resolves against baseURL, so a BASE_URL without its trailing slash would drop the last segment
const requestedURL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}/`;
const baseURL = requestedURL.endsWith('/') ? requestedURL : `${requestedURL}/`;
const buildAndPreview = `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`;

export default defineConfig({
  testDir: 'tests/e2e',
  // software WebGL (SwiftShader) draws one frame in about a second
  timeout: 120_000,
  expect: {
    timeout: 30_000,
    // Exact colours, and at most 0.1 % of the pixels (1,024 of 1,024,000) may differ. QA measured the run-to-run
    // noise of the software renderer at 359 pixels or fewer, so a real change of a few hundred pixels still fails.
    toHaveScreenshot: { threshold: 0, maxDiffPixelRatio: 0.001 },
  },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [['list']],
  // per platform: another OS rasterizes fonts and WebGL differently and needs its own baselines
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}{ext}',
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    timezoneId: 'UTC',
    locale: 'en-GB',
    // sw.js would cache the app shell between tests; the tests need the files the server serves now
    serviceWorkers: 'block',
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: {
    command: process.env.WEB_SERVER_CMD ?? buildAndPreview,
    url: baseURL,
    // a server left running from another checkout would serve other code; always start this one
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
