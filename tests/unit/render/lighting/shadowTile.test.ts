import { Matrix4, PerspectiveCamera, Vector3, Vector4 } from 'three';
import { describe, expect, it } from 'vitest';
import { ROW } from '../../../../src/render/beams/packBeam';
import { lightFragmentShader } from '../../../../src/render/lighting/glsl';
import { aimTileCamera, COLUMNS, isInTile, NEAR, ROWS, tileMatrix } from '../../../../src/render/lighting/shadowTile';
import { apexDistance } from '../../../../src/render/lighting/surfacePhotometry';

const LENS = new Vector3(1, 8, 2);
const AXIS = new Vector3(0.36, -0.48, -0.8);
const RADIUS = 0.1;
const SLOT = 5;

/** The tile matrix of slot 5 for a beam of the half angle `degrees` in that slot. */
function createTile(degrees: number): { matrix: Matrix4; camera: PerspectiveCamera; tan: number } {
  const tan = Math.tan((degrees * Math.PI) / 180);
  const poses = new Float32Array(8 * ROW);
  poses.set([LENS.x, LENS.y, LENS.z, 12, AXIS.x, AXIS.y, AXIS.z, tan], SLOT * ROW);
  poses[SLOT * ROW + 14] = RADIUS;
  const camera = new PerspectiveCamera();
  aimTileCamera(camera, poses, SLOT);
  return { matrix: tileMatrix(SLOT, camera, new Matrix4()), camera, tan };
}

/** Atlas coordinates and depth of the point `along` the axis and `across` it (two directions, by `turn`). */
function project(matrix: Matrix4, along: number, across: number, turn: number): Vector4 {
  const side = new Vector3(0, 1, 0).cross(AXIS).normalize();
  const up = new Vector3().crossVectors(AXIS, side);
  const point = LENS.clone().addScaledVector(AXIS, along);
  point.addScaledVector(side, across * Math.cos(turn)).addScaledVector(up, across * Math.sin(turn));
  const clip = new Vector4(point.x, point.y, point.z, 1).applyMatrix4(matrix);
  return clip.divideScalar(clip.w);
}

describe('the shadow tile of a key light', () => {
  it.each([2, 25])('holds the whole cone of a %i degree half angle from the lens disc on', (degrees) => {
    const { matrix, tan } = createTile(degrees);
    for (const along of [0, 0.2, NEAR, 1.5, 3.41, 12, 40]) {
      for (let turn = 0; turn < 6.28; turn += Math.PI / 4) {
        const at = project(matrix, along, RADIUS + along * tan, turn);
        expect(isInTile(SLOT, at.x, at.y), `rim at ${String(along)} m`).toBe(true);
        // the poses are 32-bit floats: a point on the near plane is at 0 within their rounding
        if (along >= NEAR) expect(at.z).toBeGreaterThan(-1e-6);
        expect(at.z).toBeLessThan(1);
      }
    }
  });

  it('draws from the virtual apex, and scenery nearer than the head is in front of its near plane', () => {
    const { camera, tan, matrix } = createTile(2);
    const back = apexDistance(RADIUS, tan);
    expect(back).toBeCloseTo(RADIUS / tan, 9);
    expect(camera.position.distanceTo(LENS.clone().addScaledVector(AXIS, -back))).toBeLessThan(1e-5);
    expect(camera.near).toBeCloseTo(back + NEAR, 5);
    expect(project(matrix, NEAR - 0.05, 0, 0).z).toBeLessThan(0);
    expect(project(matrix, NEAR + 0.05, 0, 0).z).toBeGreaterThan(0);
  });

  it('puts a point outside the cone outside the tile, and never in the place of the next tile', () => {
    const { matrix, tan } = createTile(25);
    const at = project(matrix, 6, 2 * (RADIUS + 6 * tan), 0);
    expect(isInTile(SLOT, at.x, at.y)).toBe(false);
    const inside = project(matrix, 6, 0, 0);
    expect(inside.x).toBeCloseTo(((SLOT % COLUMNS) + 0.5) / COLUMNS, 6);
    expect(inside.y).toBeCloseTo((Math.floor(SLOT / COLUMNS) + 0.5) / ROWS, 6);
    expect(isInTile(SLOT + 1, inside.x, inside.y)).toBe(false);
  });

  it('is tested against its bounds in the light shader, with the layout of the atlas', () => {
    expect(lightFragmentShader).toContain(`TILES = vec2(${String(COLUMNS)}.0, ${String(ROWS)}.0)`);
    expect(lightFragmentShader).toMatch(
      /any\(lessThan\(inTile, edge\)\) \|\| any\(greaterThan\(inTile, 1\.0 - edge\)\)/,
    );
    // the reads are 0.75 texel from the point and the filter adds half a texel: the edge is 1.5 texels
    expect(lightFragmentShader).toContain('vec2 edge = 2.0 * step * TILES;');
  });

  it('keeps a finite apex for a beam with no angle or no lens', () => {
    expect(Number.isFinite(apexDistance(0.1, 0))).toBe(true);
    expect(apexDistance(-1, 0.1)).toBe(0);
  });
});
