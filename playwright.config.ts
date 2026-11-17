import { defineConfig } from '@playwright/test';

// The suite runs against the production build, so it checks what ships. BASE_URL and WEB_SERVER_CMD point it at
// another server, for example BASE_URL=http://127.0.0.1:5173/ WEB_SERVER_CMD="npm run dev -- --port 5173 --strictPort".
const PORT = 4173;
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}/`;
const buildAndPreview = `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`;

export default defineConfig({
  testDir: 'tests/e2e',
  // software WebGL (SwiftShader) draws one frame in about a second
  timeout: 120_000,
  expect: {
    timeout: 30_000,
    // 1 % of the pixels may differ, to allow for small rasterization noise of the software renderer
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [['list']],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
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
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
