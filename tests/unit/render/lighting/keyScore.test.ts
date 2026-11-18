import { describe, expect, it } from 'vitest';
import { ROW } from '../../../../src/render/beams/packBeam';
import { KEYS, KeyShadows } from '../../../../src/render/lighting/KeyShadows';
import { keyScore } from '../../../../src/render/lighting/keyScore';

interface Beam {
  /** Height of the lens over the floor, metres. */
  y: number;
  /** Metres to the landing along the axis (0, ay, az). */
  length: number;
  ay: number;
  az: number;
  peak: number;
  tan?: number;
}

function createRow({ y, length, ay, az, peak, tan = 0.13 }: Beam): Float32Array {
  const row = new Float32Array(ROW);
  row.set([0, y, 0, length, 0, ay, az, tan, peak, peak, peak, 0.8, 0, 0, 0.1, 0]);
  return row;
}

// the rows of a real first look: narrow beams that end on truss, and the front light of the band
const ON_TRUSS = createRow({ y: 8.5, length: 3.5, ay: -0.1, az: 0.96, peak: 68.3, tan: 0.061 });
const ACROSS = createRow({ y: 8.5, length: 8.2, ay: -0.2, az: 0.13, peak: 68.3, tan: 0.061 });
const WASH_ON_TRUSS = createRow({ y: 8.7, length: 1.4, ay: -1, az: 0, peak: 1.6, tan: 0.194 });
const FLOOR_UNIT = createRow({ y: 0.6, length: 7.2, ay: 0.93, az: 0.19, peak: 68.3, tan: 0.061 });
const FRONT_KEY = createRow({ y: 9.4, length: 17, ay: -0.5, az: -0.84, peak: 4.7, tan: 0.128 });
const FOLLOW_SPOT = createRow({ y: 4.7, length: 33.9, ay: -0.09, az: -0.99, peak: 20.5, tan: 0.061 });
const BACK_LIGHT = createRow({ y: 6.3, length: 6.8, ay: -0.93, az: 0.36, peak: 0.9, tan: 0.577 });

describe('the score of a key light', () => {
  it('is nothing for a beam that ends on truss near its lens or across the stage, however bright it is there', () => {
    for (const row of [ON_TRUSS, ACROSS, WASH_ON_TRUSS, FLOOR_UNIT]) expect(keyScore(row)).toBe(0);
  });

  it('counts the front light of the band and a follow spot from the house, which comes in flat but lands low', () => {
    expect(keyScore(FRONT_KEY)).toBeGreaterThan(0.015);
    expect(keyScore(FOLLOW_SPOT)).toBeGreaterThan(0.015);
    // a back light with more light on its landing is still the lesser key: the audience does not see its shadows
    expect(keyScore(FRONT_KEY)).toBeGreaterThan(2 * keyScore(BACK_LIGHT));
  });

  it('grows with the drop and the fall, so a key near a limit does not flicker in and out', () => {
    const low = keyScore(createRow({ y: 3, length: 2, ay: -1, az: 0, peak: 4 }));
    const mid = keyScore(createRow({ y: 3, length: 2.5, ay: -1, az: 0, peak: 4 }));
    expect(low).toBeGreaterThan(0);
    expect(mid / low).toBeGreaterThan(1.2);
    const half = keyScore(createRow({ y: 8, length: 4, ay: -1, az: 0, peak: 16 }));
    const whole = keyScore(createRow({ y: 8, length: 8, ay: -1, az: 0, peak: 64 }));
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(whole);
  });

  it('measures the fall from the floor of the stage, so a stage on a platform 30 m up keeps its keys', () => {
    const raised = createRow({ y: 39.4, length: 17, ay: -0.5, az: -0.84, peak: 4.7, tan: 0.128 });
    const across = createRow({ y: 38.5, length: 8.2, ay: -0.2, az: 0.13, peak: 68.3, tan: 0.061 });
    // from world y 0 the key comes down 8.5 m of 39.4 m: under the limit of 0.35
    expect(keyScore(raised)).toBe(0);
    expect(keyScore(raised, 30)).toBe(keyScore(FRONT_KEY));
    expect(keyScore(across, 30)).toBe(0);
    // the rig finds the floor in its first frame: the lowest landing, 39.4 - 0.5 * 17 = 30.9
    const keys = new KeyShadows();
    const rows = new Float32Array(2 * ROW);
    rows.set(across, 0);
    rows.set(raised, ROW);
    const frame = (): number => {
      const extras = new Float32Array(2 * 4).fill(-1);
      for (let i = 0; i < 2; i++) keys.offer(i, i, rows.subarray(i * ROW, (i + 1) * ROW));
      keys.update(rows, extras, 1);
      for (let slot = keys.next(); slot >= 0; slot = keys.next()) keys.drawn(slot);
      return extras[4] ?? -1;
    };
    expect(frame()).toBe(-1);
    frame();
    expect(frame()).toBeGreaterThanOrEqual(0);
  });

  it('gives the front light of the band a shadow map in a rig full of beams that end on truss', () => {
    const keys = new KeyShadows();
    const count = 3 * KEYS + 1;
    const rows = new Float32Array(count * ROW);
    for (let i = 0; i < 3 * KEYS; i++) rows.set([ON_TRUSS, WASH_ON_TRUSS, ACROSS][i % 3] ?? ON_TRUSS, i * ROW);
    rows.set(FRONT_KEY, 3 * KEYS * ROW);
    const frame = (): Float32Array => {
      const extras = new Float32Array(count * 4).fill(-1);
      for (let i = 0; i < count; i++) keys.offer(i, i, rows.subarray(i * ROW, (i + 1) * ROW));
      keys.update(rows, extras, 1);
      return extras;
    };
    frame();
    for (let slot = keys.next(); slot >= 0; slot = keys.next()) keys.drawn(slot);
    const extras = frame();
    expect(extras[3 * KEYS * 4]).toBeGreaterThanOrEqual(0);
    expect([...extras].filter((value, i) => i % 4 === 0 && value >= 0)).toHaveLength(1);
  });
});
