import { describe, expect, it } from 'vitest';
import { meanAbsChange, STILL_PRESETS, StopRule } from '../../../../src/render/still/stopRule';

const probe = (value: number, size = 256 * 144): Uint8Array => new Uint8Array(size * 4).fill(value);

describe('meanAbsChange', () => {
  it('averages the RGB differences in 8-bit steps and ignores alpha', () => {
    const a = new Uint8Array([10, 20, 30, 255, 0, 0, 0, 0]);
    const b = new Uint8Array([11, 18, 30, 0, 0, 0, 3, 9]);
    expect(meanAbsChange(a, b)).toBeCloseTo((1 + 2 + 0 + 3) / 6, 12);
    expect(() => meanAbsChange(a, new Uint8Array(4))).toThrow(RangeError);
  });
});

describe('StopRule', () => {
  it('runs a preset to its count without probes', () => {
    const rule = new StopRule('final');
    expect(rule.maxSamples).toBe(STILL_PRESETS.final);
    expect([8, 16, 64].some((n) => rule.wantsProbe(n))).toBe(false);
  });

  it('probes every 8 samples and stops when the change is under half a step', () => {
    const rule = new StopRule('adaptive');
    expect(rule.maxSamples).toBe(256);
    expect([7, 8, 9, 16, 256].map((n) => rule.wantsProbe(n))).toEqual([false, true, false, true, false]);
    expect(rule.offer(probe(100))).toBe(false);
    const halfChanged = probe(100);
    // 60 % of the bytes move by one step: a change of 0.6, not converged
    for (let i = 0; i < halfChanged.length * 0.6; i++) halfChanged[i] = 101;
    expect(rule.offer(halfChanged)).toBe(false);
    const fewChanged = halfChanged.slice();
    for (let i = 0; i < fewChanged.length * 0.4; i++) fewChanged[i] = 100;
    expect(rule.offer(fewChanged)).toBe(true);
  });

  it('forgets the previous probe on reset, so the next tile starts fresh', () => {
    const rule = new StopRule('adaptive');
    rule.offer(probe(50));
    rule.reset();
    expect(rule.offer(probe(50))).toBe(false);
  });

  it('keeps its own copy of a probe the caller reuses', () => {
    const rule = new StopRule('adaptive');
    const buffer = probe(10);
    rule.offer(buffer);
    buffer.fill(200);
    expect(rule.offer(buffer)).toBe(false);
  });
});
