import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { STILL_LAYOUT } from '../../../../src/render/shadow/atlasLayout';
import { beamFrame, FRAME, framePoint, RANGE } from '../../../../src/render/shadow/beamFrame';
import { aimTileCamera, CONE_MARGIN, createTileCamera } from '../../../../src/render/shadow/tileFrustum';
import { beamShadowCoord, createTileMaps, setTileDepth } from '../../../../src/render/shadow/tileMaps';
import { beamRows, setRow } from './shadowRows';

const TAN = 0.2;

/** A tilted beam and a camera at the point (`sx`, `sy`) metres from the lens centre, across the beam. */
function shifted(sx: number, sy: number) {
  const rows = beamRows(1);
  setRow(rows, 0, { origin: [1, 8, 2], axis: [0.3, -0.9, 0.2], length: 12, tan: TAN, lens: 0.1 });
  const frame = new Float64Array(FRAME);
  beamFrame(rows, 0, frame);
  const camera = createTileCamera();
  aimTileCamera(camera, frame, sx, sy);
  /** Where the depth pass of this camera puts a point of the beam: NDC x and y, then depth over range. */
  const drawn = (z: number, qx: number, qy: number): number[] => {
    const world = new Vector3().fromArray(framePoint(frame, z, qx * z * TAN, qy * z * TAN));
    const view = world.clone().applyMatrix4(camera.matrixWorldInverse);
    const ndc = view.clone().applyMatrix4(camera.projectionMatrix);
    return [ndc.x, ndc.y, -view.z / (frame[RANGE] ?? 1)];
  };
  return { drawn, range: frame[RANGE] ?? 1 };
}

describe('a tile camera on a point of the lens disc', () => {
  it.each([
    [0.08, 0],
    [-0.05, 0.06],
  ])('draws a sample (q, z) at q - shift / (z tan), with the depth of the unshifted camera', (sx, sy) => {
    const { drawn, range } = shifted(sx, sy);
    for (const [z, qx, qy] of [
      [2, 0, 0],
      [6, 0.5, -0.3],
      [12, -1, 0.2],
    ] as const) {
      const [x = 0, y = 0, depth = 0] = drawn(z, qx, qy);
      // the camera's x is the beam's side negated (see `aimTileCamera`)
      expect(x).toBeCloseTo(-(qx - sx / (z * TAN)) / (1 + CONE_MARGIN), 6);
      expect(y).toBeCloseTo((qy - sy / (z * TAN)) / (1 + CONE_MARGIN), 6);
      expect(depth).toBeCloseTo(z / range, 9);
    }
  });

  it('is the axis camera without a shift', () => {
    const [x = 1, y = 1] = shifted(0, 0).drawn(5, 0, 0);
    expect(Math.hypot(x, y)).toBeCloseTo(0, 9);
  });
});

describe('the maps of the still layout', () => {
  it('give 64 tiles of 1024 in an atlas of 8192, each with the margin inside its own tile', () => {
    const maps = createTileMaps(STILL_LAYOUT);
    expect([maps.tiles.length, maps.depth.length]).toEqual([64 * 4, 64 * 2]);
    const reach = 512 / 8192 / (1 + CONE_MARGIN);
    expect([...maps.tiles.subarray(0, 4)]).toEqual([0.0625, 0.0625, -reach, reach].map(Math.fround));
    expect([...maps.tiles.subarray(63 * 4, 64 * 4)]).toEqual([0.9375, 0.9375, -reach, reach].map(Math.fround));
    setTileDepth(maps, 63, 20, 0.03);
    const out = new Float64Array(3);
    beamShadowCoord(maps, 63, [1, -1, 10], out);
    // the cone edge stays 0.04 / 1.04 of the half tile, about 20 texels, inside the tile
    expect(out[0]).toBeCloseTo(0.9375 - reach, 6);
    expect(out[1]).toBeCloseTo(0.9375 - reach, 6);
    expect(((out[0] ?? 0) - 0.875) * 8192).toBeCloseTo(512 - 512 / 1.04, 1);
    expect(out[2]).toBeCloseTo(10 / 20 - 0.03 / 20, 6);
  });
});
