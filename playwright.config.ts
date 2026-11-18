import { defineConfig } from '@playwright/test';

// The suite runs against the production build, so it checks what ships. BASE_URL and WEB_SERVER_CMD point it at
// another server, for example BASE_URL=http://127.0.0.1:5173/ WEB_SERVER_CMD="npm run dev -- --port 5173 --strictPort".
const PORT = 4173;
// page.goto('./?test') resolves against baseURL, so a BASE_URL without its trailing slash would drop the last segment
const requestedURL = process.env['BASE_URL'] ?? `http://127.0.0.1:${PORT}/`;
const baseURL = requestedURL.endsWith('/') ? requestedURL : `${requestedURL}/`;
const buildAndPreview = `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`;

export default defineConfig({
  testDir: 'tests/e2e',
  // software WebGL (SwiftShader) draws one frame in about a second
  timeout: 120_000,
  expect: {
    timeout: 30_000,
    // Exact colours and no differing pixel. With the raster flag below and the style file, the desk and classic shots
    // measured 0 differing pixels from run to run; either change alone let text flip by up to 8,244 pixels. The MA
    // layout's CSS 3D console flipped up to 109 edge pixels, so screenshots.spec.ts gives its shots their own margin.
    toHaveScreenshot: { threshold: 0, maxDiffPixels: 0, stylePath: 'tests/shared/singleTextRaster.css' },
  },
  // a `.only` left in a commit would silently skip the rest of the suite
  forbidOnly: true,
  fullyParallel: true,
  workers: 2,
  retries: 0,
  // CI keeps short log lines and an HTML report that the workflow uploads when a test fails; locally a list is enough
  reporter: process.env['CI'] ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : [['list']],
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
      // GPU rasterization of page tiles gave text one of two anti-aliasings at random; CPU tiles help give one
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--disable-gpu-rasterization',
      ],
    },
  },
  webServer: {
    command: process.env['WEB_SERVER_CMD'] ?? buildAndPreview,
    url: baseURL,
    // a server left running from another checkout would serve other code; always start this one
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
