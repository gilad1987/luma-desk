import { Vector4 } from 'three';
import { describe, expect, it } from 'vitest';
import { packBeam, ROW, type BeamShape } from '../../../../src/render/beams/packBeam.ts';
import * as term from '../../../../src/render/lighting/bounceTerm.ts';
import { litStage } from '../../../../src/render/lighting/bounceUniforms.ts';
import { hallRadiance } from '../../../../src/render/lights/hallLevels.ts';

type Triple = readonly [number, number, number];

/** The bounce on white in the first look, as the review measured it. */
const BOUNCE = 0.012;
/** A silver truss: the linear base colour of the lightest truss look (sRGB 0.64) and its metalness. */
const SILVER = { albedo: 0.367, metal: 0.9 };
const STAGE: term.LitStage = { centre: [0, 0, 0], reach: 15 };
const LOOK = { output: 1, soft: 1.3, gobo: 0, rotation: 0, lensRadius: 0.08 };

/** The radiance of a truss face: the bounce, and the house on what a metal has of a matt colour. */
function truss(house: number, normal: Triple, at: Triple): number {
  const matt = hallRadiance(house, normal) * SILVER.albedo * (1 - SILVER.metal);
  return term.bounceRadiance(BOUNCE, { ...SILVER, normal, at }, STAGE) + matt;
}

/** The radiance of a mid-grey figure in the band area that faces the audience: key, house and bounce. */
function figure(house: number): number {
  const front: Triple = [0, 0, 1];
  const bounce = term.bounceRadiance(BOUNCE, { albedo: 0.2, metal: 0, normal: front, at: [0, 1.5, 0] }, STAGE);
  return term.KEY_ON_FIGURE + 0.2 * hallRadiance(house, front) + bounce;
}

function row(origin: Triple, dir: Triple, length: number, hit: object | null): Float32Array {
  const [x, y, z] = origin;
  const shape: BeamShape = {
    origin: { x, y, z },
    dir: { x: dir[0], y: dir[1], z: dir[2] },
    length,
    tz: 0.2,
    col: [1, 1, 1],
    hit,
  };
  const out = new Float32Array(ROW);
  packBeam(out, shape, LOOK);
  return out;
}

describe('the bounce of the lit stage', () => {
  it('keeps the key on a figure at 0.06, the reference of the cap', () => {
    expect(term.KEY_ON_FIGURE).toBeCloseTo(0.06, 12);
  });

  it.each([0, 0.3, 0.6])('holds every face of a silver truss under the cap of the figure at House %f', (house) => {
    // over the stage, upstage of it and downstage of it: with and without the stage in view of the face
    for (const z of [0, -6, 6])
      for (const axis of [0, 1, 2])
        for (const sign of [-1, 1]) {
          const normal: Triple = [axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0];
          expect(truss(house, normal, [0, 7, z]) / figure(house)).toBeLessThan(term.METAL_BOUNCE_CAP);
        }
  });

  it('gives a face behind the stage that looks away from it no stage spill', () => {
    expect(term.stageSpill({ normal: [0, 0, -1], at: [0, 2, -5] }, STAGE)).toBe(0);
    // the same face downstage looks at the stage and gets it
    expect(term.stageSpill({ normal: [0, 0, -1], at: [0, 0, 5] }, STAGE)).toBeCloseTo(term.STAGE_SPILL * 0.9, 6);
  });

  it('lets the spill fall with distance: half at the reach', () => {
    expect(term.stageSpill({ normal: [0, 0, -1], at: [0, 0, 15] }, STAGE)).toBeCloseTo(term.STAGE_SPILL / 2, 6);
    expect(term.stageSpill({ normal: [0, 0, -1], at: [0, 0, 5] }, { centre: [0, 0, 0], reach: 0 })).toBe(0);
  });

  it('does not let a metal multiply the stage spill', () => {
    const at: Triple = [0, 0, 5];
    const normal: Triple = [0, 0, -1];
    const matt = term.bounceRadiance(1e-4, { albedo: 0.3, metal: 0, normal, at }, STAGE);
    const metal = term.bounceRadiance(1e-4, { albedo: 0.3, metal: 1, normal, at }, STAGE);
    // only the deck part (0.65 on an upright face) is mirrored
    expect(metal - matt).toBeCloseTo(1e-4 * 0.3 * 0.65 * term.METAL_MIRROR, 12);
  });

  it('takes nothing from a matt surface, however bright the bounce', () => {
    const surface = { albedo: 0.8, metal: 0, normal: [0, -1, 0] as Triple, at: [0, 3, 0] as Triple };
    expect(term.bounceRadiance(1, surface, { centre: [0, 0, 0], reach: 0 })).toBeCloseTo(0.8, 12);
  });

  it('places the lit stage at the landings of the beams that end on scenery', () => {
    const rows = new Float32Array(ROW * 3);
    rows.set(row([-4, 8, 0], [0, -1, 0], 8, {}), 0);
    rows.set(row([4, 8, 0], [0, -1, 0], 8, {}), ROW);
    // a beam into the open hall lands nowhere and must not move the centre
    rows.set(row([0, 8, 0], [0, 0, 1], 40, null), ROW * 2);
    const stage = litStage(rows, 3, new Vector4());
    expect([stage.x, stage.y, stage.z].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, 0]);
    expect(stage.w).toBeCloseTo(term.SPILL_REACH * 4, 5);
    expect(litStage(rows.subarray(ROW * 2), 1, new Vector4()).w).toBe(0);
  });
});
