import { MathUtils, Vector3 } from 'three';
import { expect } from 'vitest';
import { aimAt, dirFrom } from '../../../src/domain/aim.ts';
import type { Fixture } from '../../../src/domain/Fixture.ts';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig.ts';
import type { StageDesign, StageFixture } from '../../../src/domain/stage/StageDesign.ts';
import { planPatches } from '../../../src/mvr/export/autoPatch.ts';

/** One millimetre in world metres: the export writes millimetres, so a round trip may round below this. */
const MM = 0.001;

/** How far two beam directions may differ: the export writes matrices with 6 decimals. */
const DIRECTION_TOLERANCE = 1e-4;

/** How far two `aimAt` beams may differ in degrees: the contract's rotation tolerance (Amendment 2). */
const AIM_DEGREES = 0.1;

/** Pan/tilt pairs that turn a beam straight, sideways and angled, so a mirrored body shows in at least one. */
const PAN_TILTS = [
  [0, 0],
  [0, 30],
  [90, 45],
  [-120, 60],
] as const;

/** Targets on the floor, on the deck and in the air, front and back, for `aimAt`. */
const TARGETS = [
  [0, 0, 10],
  [-6, 1.5, -4],
  [8, 12, 3],
] as const;

/** The fixtures of a design by id, because an export groups fixtures by layer and so may change their order. */
const byId = <T extends { readonly id: number }>(items: readonly T[]): ReadonlyMap<number, T> =>
  new Map(items.map((item) => [item.id, item]));

/** The desk fields that must survive exactly, as JSON keeps them (JSON has no `-0`, the luma data is JSON). */
function deskFields({ id, type, role, trussId, mount, fixed, pixel }: StageFixture): unknown {
  return JSON.parse(JSON.stringify({ id, type, role, trussId, mount, fixed, pixel })) as unknown;
}

/** Checks that the rig fixture aims the same way as its twin: beam directions at sample pan/tilts and `aimAt`. */
function expectSameAim(before: Fixture, after: Fixture | undefined): void {
  const [a, b] = [new Vector3(), new Vector3()];
  for (const [pan, tilt] of PAN_TILTS) {
    dirFrom(before, pan, tilt, a);
    const gap = after ? dirFrom(after, pan, tilt, b).distanceTo(a) : Infinity;
    expect(gap, `fixture ${before.id} beam at pan ${pan} tilt ${tilt}`).toBeLessThanOrEqual(DIRECTION_TOLERANCE);
  }
  for (const [x, y, z] of TARGETS) {
    const want = dirFrom(before, ...pick(aimAt(before, x, y, z)), a);
    const got = after ? dirFrom(after, ...pick(aimAt(after, x, y, z)), b) : undefined;
    const degrees = got ? MathUtils.radToDeg(got.angleTo(want)) : Infinity;
    expect(degrees, `fixture ${before.id} aim at ${x},${y},${z} in degrees`).toBeLessThanOrEqual(AIM_DEGREES);
  }
}

/** A pan/tilt as the two arguments `dirFrom` takes. */
const pick = ({ pan, tilt }: { readonly pan: number; readonly tilt: number }): [number, number] => [pan, tilt];

/**
 * Checks that `after` (an export of `before`, imported again) is the same rig: every fixture id, its desk fields
 * (type, role, truss, mount, `fixed`, `pixel`), its position within 1 mm, the way it aims and its patch. Aim is
 * compared through the desk's own `dirFrom` and `aimAt`, not through the stored fields, because a body rotation and
 * a mount can describe one pose in two ways. A fixture `before` left unpatched must hold the address the export
 * assigned it, so the check compares against the export's own patch plan.
 */
export function expectRigKept(before: StageDesign, after: StageDesign): void {
  const plan = planPatches(before.fixtures, before.mvr).patches;
  const twins = byId(after.fixtures);
  expect([...twins.keys()].sort((a, b) => a - b)).toEqual([...byId(before.fixtures).keys()].sort((a, b) => a - b));
  for (const fixture of before.fixtures) {
    const twin = twins.get(fixture.id);
    const [dx, dy, dz] = fixture.position.map((value, axis) => value - (twin?.position[axis] ?? Infinity));
    expect(Math.hypot(dx ?? 0, dy ?? 0, dz ?? 0), `fixture ${fixture.id} position`).toBeLessThanOrEqual(MM);
    expect(twin && deskFields(twin), `fixture ${fixture.id} desk fields`).toEqual(deskFields(fixture));
    expect(twin?.patch, `fixture ${fixture.id} patch`).toEqual(plan.get(fixture.id));
  }
  const rigAfter = byId(rigFromDesign(after).fixtures);
  for (const fixture of rigFromDesign(before).fixtures) expectSameAim(fixture, rigAfter.get(fixture.id));
}
