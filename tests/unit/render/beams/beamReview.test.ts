/** The fixes of the beam review: the gobo frame, rows that are not finite, and a flush without a lit carrier. */
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BeamBatch } from '../../../../src/render/beams/BeamBatch';
import { beamVertexShader } from '../../../../src/render/beams/glsl';
import { packBeam, ROW, type BeamLook, type BeamShape } from '../../../../src/render/beams/packBeam';

const DOWN = new Vector3(0, -1, 0);

/** The side vector as `glsl/beam.vert.glsl` computes it. */
function shaderSide(axis: Vector3): Vector3 {
  const fromUp = 1 - axis.y;
  if (fromUp < 1e-6) return new Vector3(-1, 0, 0);
  const lean = axis
    .clone()
    .sub(new Vector3(0, 1, 0))
    .multiplyScalar(axis.x / fromUp);
  return new Vector3(1, 0, 0).sub(lean).normalize();
}

const shape: BeamShape = {
  origin: { x: 1, y: 8, z: 2 },
  dir: { x: 0, y: -1, z: 0 },
  length: 9,
  tz: 0.1,
  col: [1, 1, 1],
  hit: {},
};
const look: BeamLook = { output: 1, soft: 1.3, gobo: 2, rotation: 0.4, lensRadius: 0.08 };

describe('beam review', () => {
  it('gives the shaft gobo the frame of the cone mesh, also through +-x and straight up', () => {
    expect(beamVertexShader).toContain('(axis.x / fromUp) * (axis - vec3(0.0, 1.0, 0.0))');
    const axes = [
      [1, 0, 0],
      [-1, 0, 0],
      [0.9995, -0.03, 0.01],
      [0.9985, 0.05, -0.02],
      [0, -1, 0],
      [0.3, -0.8, 0.5],
      [0, 1, 0],
    ];
    for (const [x = 0, y = 0, z = 0] of axes) {
      const axis = new Vector3(x, y, z).normalize();
      const mesh = new Vector3(1, 0, 0).applyQuaternion(new Quaternion().setFromUnitVectors(DOWN, axis));
      expect(shaderSide(axis).distanceTo(mesh)).toBeLessThan(1e-6);
    }
  });

  it('writes a zero row for a beam with a value that is not finite', () => {
    const row = new Float32Array(ROW).fill(7);
    packBeam(row, { ...shape, tz: Infinity }, look);
    expect([...row]).toEqual(new Array(ROW).fill(0));
    packBeam(row, { ...shape, origin: { x: NaN, y: 0, z: 0 } }, look);
    expect([...row]).toEqual(new Array(ROW).fill(0));
    packBeam(row, shape, { ...look, lensRadius: NaN });
    expect([...row]).toEqual(new Array(ROW).fill(0));
    packBeam(row, shape, look);
    expect(row[3]).toBeGreaterThan(0);
  });

  it('flushes the lit carriers only and drops one that left the stage', () => {
    const batch = new BeamBatch();
    const lit = { visible: true, parent: {} };
    const dark = { visible: false, parent: {} };
    const gone = { visible: true, parent: null };
    batch.row(lit).fill(1);
    batch.row(dark).fill(2);
    batch.row(gone).fill(3);
    const out = new Float32Array(3 * ROW);
    expect(batch.flush(out)).toBe(1);
    expect(out[0]).toBe(1);
    expect(batch.size).toBe(2);
  });
});
