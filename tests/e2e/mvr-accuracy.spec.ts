import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { bootApp, collectErrors, mvrFile, pickMvrFile } from '../shared/e2e';
import {
  ACCURACY_FIXTURES,
  accuracyStageMvr,
  angleDeg,
  axesInThree,
  drawnPlacements,
  probeMvr,
  toThree,
  turnByQuat,
} from '../shared';

// The accuracy gate: an independent reader (tests/shared/mvrProbe, no code shared with src/mvr) says where the file
// puts each fixture; the app says where it draws it. The only thing taken from the app is its own fit offset.
// SwiftShader is slow under load; every wait is on a state (mvrReady, frozen-clock frames), so only the budget grows.
test.describe.configure({ timeout: 360_000 });
const MAX_POSITION_MM = 1;
const MAX_ANGLE_DEG = 0.05;
const MAX_BODY_SIZE = 0.02;
// the tilted GDTF mesh body of accuracyStageMvr, whose box top is 100 mm from its origin
const MESH_FIXTURE = 'A-207';
interface Row {
  uuid: string;
  kind: string | null;
  mm: number;
  deg: number;
  deltaMm: number[];
  rotated: boolean;
}
// the unit X, Y and Z axes, as rows of the identity
const AXES = ([0, 1, 2] as const).map((i): [number, number, number] => [+(i === 0), +(i === 1), +(i === 2)]);

/** Imports the accuracy stage and returns, per probed fixture, the position error (mm) and the axis error (deg). */
async function measure(page: Page, testInfo: TestInfo): Promise<Row[]> {
  const bytes = accuracyStageMvr();
  const probe = probeMvr(bytes);
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, mvrFile('Accuracy.mvr', bytes));
  // the GDTF mesh body is built after its mesh file loads; until then the fixture is drawn as a desk model
  const kindOf = async (): Promise<unknown> =>
    (await drawnPlacements(desk)).fixtures.find((f) => f.uuid === MESH_FIXTURE)?.kind;
  await expect.poll(kindOf, { message: `${MESH_FIXTURE} drawn as a GDTF body`, timeout: 120_000 }).toBe('gdtf');
  const drawn = await drawnPlacements(desk);
  expect(probe.fixtures).toHaveLength(ACCURACY_FIXTURES);
  expect(drawn.fixtures).toHaveLength(probe.fixtures.length);
  const offset = drawn.offset ?? [0, 0, 0];
  const rows = probe.fixtures.map((want): Row => {
    const got = drawn.fixtures.find((f) => f.uuid === want.uuid);
    const at = toThree(want.position).map((v, i) => v + (offset[i] ?? 0));
    const deltaMm = got?.clamp ? got.clamp.map((v, i) => Math.round((v - (at[i] ?? 0)) * 1e6) / 1000) : [];
    const axes = axesInThree(want.matrix);
    const q = got?.bodyRotation ?? [0, 0, 0, 1];
    const deg = Math.max(...AXES.map((e, i) => angleDeg(turnByQuat(q, e), axes[i] ?? e)));
    const mm = got?.clamp ? Math.hypot(...deltaMm) : Infinity;
    return { uuid: want.uuid, kind: got?.kind ?? null, mm, deg, deltaMm, rotated: !!got?.rotation };
  });
  await testInfo.attach('accuracy.json', { body: JSON.stringify({ offset, rows }, null, 2) });
  return rows;
}

// `clamp` is the point MVR places: the GDTF root geometry's origin for a GDTF body, the top of the rest-pose box for a
// desk model (where `fitDeskModel` puts the insertion point). Never the rig position, the tilt axis after the mount
// shift. The GDTF mesh body reaches 100 mm above its origin, so reading its box top would fail by 100 mm.
test('imported fixtures are drawn at their MVR insertion points within 1 mm', async ({ page }, testInfo) => {
  const rows = await measure(page, testInfo);
  expect(rows.find((r) => r.uuid === MESH_FIXTURE)?.kind).toBe('gdtf');
  expect(rows.filter((r) => !(r.mm <= MAX_POSITION_MM))).toEqual([]);
});

test('rotated imported fixtures are turned as the file turns them, within 0.05 degrees', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  const rows = await measure(page, testInfo);
  // those with a rig body rotation; the floor unit has none and is the separate test below
  expect(rows.filter((r) => r.rotated && !(r.deg <= MAX_ANGLE_DEG))).toEqual([]);
  expect(errors).toEqual([]);
});

// Floor unit A-205 (turned 180 degrees about X, beam up) was drawn 180 degrees off until the body took the MVR matrix.
test('the floor-standing fixture is turned as the file turns it, within 0.05 degrees', async ({ page }, testInfo) => {
  const rows = await measure(page, testInfo);
  expect(rows.filter((r) => !(r.deg <= MAX_ANGLE_DEG))).toEqual([]);
});

// LED bar 204 (GDTF 0.12 m high) was drawn 0.162 m high, +35 %, until the body size came from the mesh vertices.
test('drawn fixture bodies match their GDTF boxes within 2 %', async ({ page }, testInfo) => {
  const desk = await bootApp(page);
  await pickMvrFile(page, desk, mvrFile('Accuracy.mvr', accuracyStageMvr()));
  const bodies = await desk.evaluate((d) => d.mvrBodies());
  await testInfo.attach('bodies.json', { body: JSON.stringify(bodies, null, 2) });
  expect(bodies).toHaveLength(ACCURACY_FIXTURES);
  const meshed = bodies.filter((b) => b.box !== null);
  expect(meshed.length).toBeGreaterThan(0);
  // size is width (X), depth (Z), height (Y) of the drawn body, box the GDTF X, Y, Z: the same three extents in order
  const off = meshed.flatMap(({ id, box, size }) => (box ?? []).map((want, i) => ({ id, i, want, got: size[i] ?? 0 })));
  expect(off.filter((o) => !(Math.abs(o.got - o.want) <= MAX_BODY_SIZE * o.want))).toEqual([]);
});
