import { expect, test } from '@playwright/test';
import { bootApp, mvrFile, pickMvrFile } from '../shared/e2e';
import {
  accuracyStageMvr,
  drawnPlacements,
  drawnSceneryBoxes,
  probeLayerBox,
  probeMvr,
  SCENERY_LAYERS,
  SCENERY_MESHES,
} from '../shared';

// Scenery placement against the independent reader (tests/shared/mvrProbe): each object under test sits alone in its
// own layer of accuracyStageMvr, so the drawn layer group's world box is its box. The app gives only its fit offset.
// SwiftShader is slow under load; every wait is on a state, so only the time budget grows.
test.describe.configure({ timeout: 360_000 });
const MAX_MM = 2;

test('scenery in a turned group and in nested symbols, instanced and merged, is drawn within 2 mm of the file', async ({
  page,
}, testInfo) => {
  const bytes = accuracyStageMvr();
  const probe = probeMvr(bytes);
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, mvrFile('Accuracy.mvr', bytes));
  await desk.evaluate((d) => d.mvrReady());
  const layers = Object.values(SCENERY_LAYERS);
  const drawnOf = async (): Promise<number> =>
    (await drawnSceneryBoxes(desk)).filter((b) => (layers as readonly string[]).includes(b.layer)).length;
  await expect.poll(drawnOf, { message: 'the three scenery layers drawn', timeout: 120_000 }).toBe(layers.length);
  const offset = (await drawnPlacements(desk)).offset ?? [0, 0, 0];
  const drawn = await drawnSceneryBoxes(desk);
  const rows = layers.map((layer) => {
    const want = probeLayerBox(probe, layer, SCENERY_MESHES, offset);
    const got = drawn.find((b) => b.layer === layer);
    const deltaMm = got ? [...got.min, ...got.max].map((v, i) => ([...want.min, ...want.max][i] ?? 0) - v) : [];
    const mm = got ? Math.max(...deltaMm.map((d) => Math.abs(d) * 1000)) : Infinity;
    return { layer, want, got, mm };
  });
  await testInfo.attach('scenery.json', { body: JSON.stringify({ offset, rows }, null, 2) });
  // the instanced layer places the crate twice, the merged one once: both paths of the layer build are covered
  expect(probe.meshes.filter((m) => m.layer === SCENERY_LAYERS.instanced)).toHaveLength(2);
  expect(probe.meshes.filter((m) => m.layer === SCENERY_LAYERS.merged)).toHaveLength(1);
  expect(rows.filter((r) => !(r.mm <= MAX_MM)).map(({ layer, mm }) => ({ layer, mm }))).toEqual([]);
});
