import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// The frame-time gate (`npm run test:perf`), local only: it needs the real GPU, which CI runners do not have. Chromium
// draws through ANGLE on Metal with the flags the measurement scripts use; SwiftShader time says nothing of a GPU.
export default defineConfig({
  ...base,
  testDir: 'tests/perf',
  // one test at a time: two would share the GPU and each would measure the other
  workers: 1,
  fullyParallel: false,
  timeout: 300_000,
  use: {
    ...base.use,
    viewport: { width: 2560, height: 1440 },
    launchOptions: { args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] },
  },
});
