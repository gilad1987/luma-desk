import { Euler, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { aimAt, dirFrom } from '../../../src/domain/aim';
import { Fixture, type Mount } from '../../../src/domain/Fixture';
import { frameOf } from '../../../src/domain/stage/StageFrame';
import { createTemplate } from '../../../src/domain/stage/templates';
import { lookTargetOf } from '../../../src/show/mvrLook/lookTarget';

const frame = frameOf(createTemplate('festival'));
const { x0, x1, z0, z1, height } = frame.deck;
const half = Math.abs(x1 - x0) / 2;
const midZ = (z0 + z1) / 2;
const target = lookTargetOf(frame);

/** A beam at `pos` with an optional body rotation in degrees (x, y, z), as an MVR import sets it. */
function beamAt(pos: Vector3, mount: Mount, turn?: readonly [number, number, number]): Fixture {
  const f = new Fixture({ id: 1, type: 'beam', pos, mount, fixed: null });
  if (turn) f.rotation = new Quaternion().setFromEuler(new Euler(...turn.map((d) => (d * Math.PI) / 180)));
  return f;
}

/** How far the aimed beam of `f` passes from its target, and whether the target lies ahead of the head. */
function missOf(f: Fixture): { readonly miss: number; readonly ahead: boolean } {
  const [tx, ty, tz] = target(f);
  const { pan = NaN, tilt = NaN } = aimAt(f, tx, ty, tz);
  const dir = dirFrom(f, pan, tilt, new Vector3());
  const toTarget = new Vector3(tx, ty, tz).sub(f.pos);
  const along = toTarget.dot(dir);
  return { miss: toTarget.sub(dir.multiplyScalar(along)).length(), ahead: along > 0 };
}

const CASES: readonly (readonly [string, Fixture])[] = [
  ['hung far outside the deck width', beamAt(new Vector3(-3 * half, 10, midZ), 'hang')],
  ['floor-standing outside the deck', beamAt(new Vector3(2.5 * half, 0, midZ), 'floor')],
  ['turned over (beam up) by its rotation', beamAt(new Vector3(-half, 1, midZ), 'hang', [180, 0, 0])],
  ['side-hung, beam towards the stage', beamAt(new Vector3(-2 * half, 6, midZ), 'hang', [0, 0, 90])],
  ['hung and turned in plan', beamAt(new Vector3(half * 0.5, 9, midZ - 2), 'hang', [0, 75, 0])],
  ['hung on a tilted circle truss', beamAt(new Vector3(-half * 0.8, 8, midZ), 'hang', [30, 0, 20])],
  ['front of house', beamAt(new Vector3(half, 8, Math.max(z0, z1) + 15), 'hang')],
];

describe('lookTargetOf', () => {
  it.each(CASES)('aims a beam %s through its target', (_, f) => {
    const { miss, ahead } = missOf(f);
    expect(ahead).toBe(true);
    expect(miss).toBeLessThan(0.1);
  });

  it.each(CASES)('keeps the target of a beam %s inside the deck width', (_, f) => {
    const [x] = target(f);
    expect(x).toBeGreaterThanOrEqual(Math.min(x0, x1));
    expect(x).toBeLessThanOrEqual(Math.max(x0, x1));
  });

  it('mirrors the side: left units land right of the centre and right units left', () => {
    const centre = (x0 + x1) / 2;
    expect(target(beamAt(new Vector3(centre - 4, 9, midZ), 'hang'))[0]).toBeGreaterThan(centre);
    expect(target(beamAt(new Vector3(centre + 4, 9, midZ), 'hang'))[0]).toBeLessThan(centre);
  });

  it('crosses standing units in the air and lands hung units on the deck', () => {
    expect(target(beamAt(new Vector3(-4, 0, midZ), 'floor'))[1]).toBeGreaterThan(height + 3);
    expect(target(beamAt(new Vector3(-4, 9, midZ), 'hang'))[1]).toBe(height);
  });
});
