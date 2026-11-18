import { describe, expect, it } from 'vitest';
import { BeamBatch } from '../../../../src/render/beams/BeamBatch';
import { innerFraction, peakIntensity } from '../../../../src/render/beams/beamIntensity';
import { packBeam, ROW, type BeamShape } from '../../../../src/render/beams/packBeam';

const TAN = Math.tan((2 * Math.PI) / 180);
const shape: BeamShape = {
  origin: { x: 1, y: 8, z: -3 },
  dir: { x: 0, y: -1, z: 0 },
  length: 7.5,
  tz: TAN,
  col: [1, 0.5, 0.25],
  hit: {},
};
const look = { output: 0.8, soft: 1.6, gobo: 3, rotation: 0.5, lensRadius: 0.125 };

describe('packBeam', () => {
  it('writes the four vec4 attributes of one beam', () => {
    const row = new Float32Array(ROW);
    packBeam(row, shape, look);
    const scale = 0.8 * peakIntensity(TAN);
    const expected = [1, 8, -3, 7.5, 0, -1, 0, TAN, scale, 0.5 * scale, 0.25 * scale, innerFraction(1.6)];
    expected.push(3, 0.5, 0.125, 0);
    expect(Array.from(row)).toEqual(Array.from(new Float32Array(expected)));
  });

  it('fades a beam that ends in the air and shows the open gobo for a slot outside the sheet', () => {
    const row = new Float32Array(ROW);
    packBeam(row, { ...shape, hit: null, length: 85 }, { ...look, gobo: 12 });
    expect(row[15]).toBe(1);
    expect(row[12]).toBe(0);
  });

  it('cuts a very wide beam before its hit and fades the cut', () => {
    const row = new Float32Array(ROW);
    packBeam(row, { ...shape, tz: Math.tan(Math.PI / 3), length: 60 }, look);
    expect(row[3]).toBeLessThan(20);
    expect(row[15]).toBe(1);
  });
});

describe('BeamBatch', () => {
  it('packs the rows of the lit carriers and drops a carrier that left the scene', () => {
    const batch = new BeamBatch();
    const lit = { visible: true, parent: {} };
    const dark = { visible: false, parent: {} };
    const gone: { visible: boolean; parent: object | null } = { visible: true, parent: {} };
    batch.row(dark).fill(1);
    batch.row(gone).fill(2);
    batch.row(lit).fill(3);
    expect(batch.row(lit)).toBe(batch.row(lit));
    const out = new Float32Array(4 * ROW);
    expect(batch.flush(out)).toBe(2);
    expect([out[0], out[ROW], out[2 * ROW]]).toEqual([2, 3, 0]);
    gone.parent = null;
    dark.visible = true;
    expect(batch.flush(out)).toBe(2);
    expect([out[0], out[ROW]]).toEqual([1, 3]);
    expect(batch.size).toBe(2);
  });

  it('does not write past the end of the buffer', () => {
    const batch = new BeamBatch();
    batch.row({ visible: true, parent: {} }).fill(1);
    batch.row({ visible: true, parent: {} }).fill(1);
    expect(batch.flush(new Float32Array(ROW))).toBe(1);
  });
});
