import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { TestInfo } from '@playwright/test';
import { imageGateFailures } from './limits';
import { perceptualDiff, type PerceptualDiff } from './perceptualDiff';
import { decodePng, encodePng } from './png';

/**
 * Baselines of the perceptual gate, under tests/e2e. One folder for every OS: they are drawn by SwiftShader, the same
 * CPU rasterizer on macOS and on the Linux CI runner, and the metric forgives the last-bit differences between builds.
 * The bit-exact `@screenshot` baselines stay per platform in __screenshots__.
 */
export const IMAGE_BASELINE_DIR = '__baselines__/swiftshader';
/** Set to 1 to write the current shots as the new baselines (see docs/render-gates.md); the tests then pass. */
export const UPDATE_ENV = 'UPDATE_IMAGE_BASELINES';

export interface ImageGateResult {
  diff: Omit<PerceptualDiff, 'heatmap'>;
  /** The limits the shot breaks; empty when it passes. */
  failures: string[];
}

/**
 * Compares a PNG shot with its baseline `<spec name>/<name>.png` by the perceptual metric, and attaches the numbers
 * always and the shot and heat-map when a limit breaks, so a red CI run shows where the picture changed.
 */
export async function gateImage(
  name: string,
  shot: Uint8Array,
  testInfo: TestInfo,
  // false for a shot that differs on purpose (the sensitivity test), so recording never stores it as a baseline
  record = true,
): Promise<ImageGateResult> {
  const spec = testInfo.titlePath[0]?.replace(/\.spec\.ts$/, '') ?? 'spec';
  const file = join(testInfo.config.rootDir, IMAGE_BASELINE_DIR, spec, `${name}.png`);
  if (record && process.env[UPDATE_ENV] === '1') {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, shot);
  }
  const actual = { body: Buffer.from(shot), contentType: 'image/png' };
  if (!existsSync(file)) {
    // the CI report then holds the shot, so a first run on a new platform can supply the baseline (docs/render-gates.md)
    await testInfo.attach(`${name}-actual.png`, actual);
    throw new Error(`no baseline ${file}; record it with ${UPDATE_ENV}=1`);
  }
  const { heatmap, ...diff } = perceptualDiff(decodePng(readFileSync(file)), decodePng(shot));
  const failures = imageGateFailures(diff);
  await testInfo.attach(`${name}-diff.json`, { body: JSON.stringify(diff, null, 2), contentType: 'application/json' });
  if (failures.length > 0) {
    await testInfo.attach(`${name}-actual.png`, actual);
    await testInfo.attach(`${name}-baseline.png`, { path: file, contentType: 'image/png' });
    await testInfo.attach(`${name}-heatmap.png`, { body: Buffer.from(encodePng(heatmap)), contentType: 'image/png' });
  }
  return { diff, failures };
}
