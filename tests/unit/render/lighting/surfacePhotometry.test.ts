import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { packBeam, ROW, type BeamLook, type BeamShape } from '../../../../src/render/beams/packBeam';
import {
  CUT_LEVEL,
  lightRange,
  litFlux,
  MAX_RANGE,
  surfaceRadiance,
} from '../../../../src/render/lighting/surfacePhotometry';

const LOOK: BeamLook = { output: 1, soft: 1.3, gobo: 0, rotation: 0, lensRadius: 0.08 };

function rowOf(zoomDegrees: number, col: readonly number[] = [1, 1, 1]): Float32Array {
  const shape: BeamShape = {
    origin: { x: 0, y: 8, z: 0 },
    dir: { x: 0, y: -1, z: 0 },
    length: 8,
    tz: Math.tan((zoomDegrees * Math.PI) / 360),
    col,
    hit: {},
  };
  const row = new Float32Array(ROW);
  packBeam(row, shape, LOOK);
  return row;
}

describe('the photometric scale of the surface light', () => {
  it('gives a narrow beam a brighter pool than a wide one of the same output, by the ratio of their areas', () => {
    const narrow = rowOf(4);
    const wide = rowOf(40);
    const ratio = surfaceRadiance(narrow[8] ?? 0, 8, 0) / surfaceRadiance(wide[8] ?? 0, 8, 0);
    // the pool area grows with about the square of the angle: 10 times the angle, about 100 times the area
    expect(ratio).toBeGreaterThan(90);
    expect(ratio).toBeLessThan(110);
  });

  it('keeps the flux of a fixture when its zoom changes', () => {
    const narrow = litFlux(rowOf(4), 1, new Vector3());
    const wide = litFlux(rowOf(40), 1, new Vector3());
    expect(narrow.x).toBeCloseTo(1, 5);
    expect(wide.x).toBeCloseTo(narrow.x, 5);
  });

  it('sums the flux per colour channel over the lit rows only', () => {
    const rows = new Float32Array(3 * ROW);
    rows.set(rowOf(20, [1, 0, 0]), 0);
    rows.set(rowOf(8, [0, 0.5, 0]), ROW);
    rows.set(rowOf(8, [1, 1, 1]), 2 * ROW);
    const flux = litFlux(rows, 2, new Vector3());
    expect(flux.x).toBeCloseTo(1, 5);
    expect(flux.y).toBeCloseTo(0.5, 5);
    expect(flux.z).toBe(0);
  });

  it('follows the inverse square law and stays finite on the lens', () => {
    expect(surfaceRadiance(10, 4, 0) / surfaceRadiance(10, 8, 0)).toBeCloseTo(4, 6);
    expect(Number.isFinite(surfaceRadiance(10, 0, 0.8))).toBe(true);
  });

  it('ends a light volume where a facing surface reaches the cut level, and never past the longest range', () => {
    const range = lightRange(0.02);
    expect(surfaceRadiance(0.02, range, 0)).toBeCloseTo(CUT_LEVEL, 6);
    expect(lightRange(1e6)).toBe(MAX_RANGE);
    expect(lightRange(0)).toBe(0);
  });
});
