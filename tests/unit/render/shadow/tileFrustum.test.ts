import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { LIVE_LAYOUT, RECT, tileRects } from '../../../../src/render/shadow/atlasLayout';
import { beamFrame, FRAME, framePoint, RANGE } from '../../../../src/render/shadow/beamFrame';
import { aimTileCamera, CONE_MARGIN, createTileCamera } from '../../../../src/render/shadow/tileFrustum';
import { beamShadow, beamShadowCoord, createTileMaps, setTileDepth } from '../../../../src/render/shadow/tileMaps';
import { beamRows, setRow } from './shadowRows';

const TILE = 9;
const BIAS = 0.03;

/** A beam, its tile camera and maps, and `drawn`: where the depth pass puts a point of the beam (u, v, depth). */
function setup(axis: readonly [number, number, number]) {
  const rows = beamRows(1);
  setRow(rows, 0, { origin: [1, 8, 2], axis, length: 12, tan: 0.2, lens: 0.1 });
  const frame = new Float64Array(FRAME);
  beamFrame(rows, 0, frame);
  const camera = createTileCamera();
  aimTileCamera(camera, frame);
  const maps = createTileMaps(LIVE_LAYOUT);
  const range = frame[RANGE] ?? 0;
  setTileDepth(maps, TILE, range, BIAS);
  const rects = tileRects(LIVE_LAYOUT);
  const [x = 0, y = 0, side = 0] = rects.subarray(TILE * RECT, TILE * RECT + RECT);
  const drawn = (z: number, qx: number, qy: number): number[] => {
    const spread = z * 0.2;
    const world = new Vector3().fromArray(framePoint(frame, z, qx * spread, qy * spread));
    const view = world.clone().applyMatrix4(camera.matrixWorldInverse);
    const ndc = view.clone().applyMatrix4(camera.projectionMatrix);
    return [(x + (0.5 + 0.5 * ndc.x) * side) / 4096, (y + (0.5 + 0.5 * ndc.y) * side) / 4096, -view.z / range];
  };
  const sampled = (z: number, qx: number, qy: number): number[] => {
    const out = new Float64Array(3);
    beamShadowCoord(maps, TILE, [qx, qy, z], out);
    return [...out];
  };
  return { camera, maps, range, drawn, sampled, centre: [(x + side / 2) / 4096, (y + side / 2) / 4096], side };
}

describe.each([
  ['a tilted beam', [0.3, -0.9, 0.2]],
  ['a beam along the world x', [1, 0, 0]],
] as const)('the tile frustum of %s', (_name, axis) => {
  it('maps a point on the axis at z to the tile centre with depth z / range', () => {
    const { drawn, sampled, centre, range } = setup(axis);
    for (const z of [1, 5, 12]) {
      const [u = 0, v = 0, depth = 0] = drawn(z, 0, 0);
      expect(u).toBeCloseTo(centre[0] ?? 0, 9);
      expect(v).toBeCloseTo(centre[1] ?? 0, 9);
      expect(depth).toBeCloseTo(z / range, 9);
      expect(sampled(z, 0, 0)).toEqual([centre[0], centre[1], expect.closeTo(z / range - BIAS / range, 6)]);
    }
  });

  it('maps q = (1, 0) and q = (0, 1) to the tile edge less the margin, where the sampler reads', () => {
    const { drawn, sampled, centre, side } = setup(axis);
    const reach = side / 2 / 4096 / (1 + CONE_MARGIN);
    for (const [qx, qy] of [
      [1, 0],
      [0, 1],
      [-0.6, 0.3],
    ] as const) {
      const [u = 0, v = 0] = drawn(7, qx, qy);
      const [su = 0, sv = 0] = sampled(7, qx, qy);
      expect(su).toBeCloseTo(u, 6);
      expect(sv).toBeCloseTo(v, 6);
      expect(Math.abs(u - (centre[0] ?? 0))).toBeCloseTo(Math.abs(qx) * reach, 6);
      expect(Math.abs(v - (centre[1] ?? 0))).toBeCloseTo(Math.abs(qy) * reach, 6);
    }
  });

  it('is a rotation, so triangles keep their winding, and clips 0.5 m past the lens and past the end', () => {
    const { camera, drawn } = setup(axis);
    // the axis is a 32-bit float row, so the frame is a rotation to float precision
    expect(camera.matrixWorld.determinant()).toBeCloseTo(1, 6);
    expect(drawn(0.5, 0, 0)[2]).toBeCloseTo(0.5 / 12.5, 9);
    const clipZ = (z: number): number => new Vector3(0, 0, -z).applyMatrix4(camera.projectionMatrix).z;
    // the lens is 0.5 m from the apex, and the tile starts 0.5 m past it
    expect(clipZ(1)).toBeCloseTo(-1, 6);
    expect(clipZ(12.5)).toBeCloseTo(1, 6);
  });
});

describe('beamShadow', () => {
  it('is lit before the stored depth, dark behind it, and lit without a tile', () => {
    const { maps, range } = setup([0, -1, 0]);
    const depthAt = (): number => 0.5;
    expect(beamShadow(maps, depthAt, [0, 0, 0.4 * range], TILE)).toBe(1);
    expect(beamShadow(maps, depthAt, [0, 0, 0.6 * range], TILE)).toBe(0);
    // the bias: a surface compared with its own depth stays lit
    expect(beamShadow(maps, depthAt, [0, 0, 0.5 * range + BIAS / 2], TILE)).toBe(1);
    expect(beamShadow(maps, depthAt, [0, 0, 0.6 * range], -1)).toBe(1);
  });
});
