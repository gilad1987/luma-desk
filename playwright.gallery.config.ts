import { defineConfig } from '@playwright/test';

// The dev-only fixture gallery shot runner, apart from the parity suite (`playwright.config.ts`, testDir tests/e2e):
//   GALLERY_IDS=robe-esprite GALLERY_OUT=some/dir npx playwright test -c playwright.gallery.config.ts
// It serves the source tree with the Vite dev server, since `vite build` does not build gallery.html.
const PORT = 5181;
const baseURL = `http://127.0.0.1:${PORT}/`;

export default defineConfig({
  testDir: 'tests/gallery',
  // the spec sets its own budget from the number of shots it takes
  timeout: 120_000,
  expect: { timeout: 30_000 },
  forbidOnly: true,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    // the software WebGL flags of playwright.config.ts, so a shot looks the same on every machine
    launchOptions: {
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
    command: `npx vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: baseURL,
    // a server left running from another checkout would serve other code; always start this one
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
