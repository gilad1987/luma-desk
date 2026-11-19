import { describe, expect, it } from 'vitest';
import { BLOCK, decodePng, encodePng, IMAGE_LIMITS, imageGateFailures, perceptualDiff } from '../../shared';
import { stage, withLine } from './gateImages';
import { exposed, hueTurned, noisy } from './imageEdits';

// The metric's own arithmetic; tests/unit/gates/imageLimits.test.ts is the pass-or-fail specification of the gate.
describe('perceptualDiff', () => {
  const base = stage(64);

  it('is 0 for identical images', () => {
    expect(perceptualDiff(base, stage(64))).toMatchObject({ mean: 0, share: 0, worst: 0, exposure: 0, hue: 0 });
  });

  it('a 2 LSB re-run noise is far below every limit', () => {
    const d = perceptualDiff(base, noisy(base, 2));
    expect(d.mean).toBeLessThan(IMAGE_LIMITS.mean / 4);
    expect(Math.abs(d.exposure)).toBeLessThan(IMAGE_LIMITS.exposure / 10);
    expect(Math.abs(d.hue)).toBeLessThan(IMAGE_LIMITS.hue / 10);
    expect(d.worst).toBeLessThan(IMAGE_LIMITS.worst / 10);
  });

  it('a 1-pixel move of a sharp beam edge measures about 0: the blocks find their match one pixel over', () => {
    const d = perceptualDiff(base, stage(65));
    expect(d.worst).toBeLessThan(0.001);
    expect(imageGateFailures(d)).toEqual([]);
  });

  it('exposure is ln of the luminance ratio, and the mean alone cannot see 5 %', () => {
    const d = perceptualDiff(base, exposed(base, 1.05));
    // the white beam clips at 255, so the measured ratio stays a little under 1.05
    expect(d.exposure).toBeGreaterThan(Math.log(1.045));
    expect(d.exposure).toBeLessThan(Math.log(1.05) + 0.001);
    expect(d.mean).toBeLessThan(IMAGE_LIMITS.mean);
  });

  it('hue is the signed turn in degrees, decided by the saturated wash', () => {
    expect(perceptualDiff(base, hueTurned(base, 10)).hue).toBeCloseTo(10, 0);
    expect(perceptualDiff(base, hueTurned(base, -3)).hue).toBeLessThan(-2);
  });

  it('sees a 1 px line added on a block edge from both sides, since one side alone finds a window without it', () => {
    const line = { x: 0, y: 30, length: 64, width: 1, vertical: true, rgb: [200, 200, 200] as const };
    for (const x of [BLOCK, BLOCK - 1]) {
      expect(perceptualDiff(base, withLine(base, { ...line, x: 120 + x })).worst).toBeGreaterThan(0.05);
      expect(perceptualDiff(withLine(base, { ...line, x: 120 + x }), base).worst).toBeGreaterThan(0.05);
    }
  });

  it('rejects images of different sizes', () => {
    expect(() => perceptualDiff(base, { width: 1, height: 1, data: new Uint8Array(4) })).toThrow(/sizes differ/);
  });

  it('its heat-map PNG survives an encode and decode round trip', () => {
    const { heatmap } = perceptualDiff(base, stage(70));
    const back = decodePng(encodePng(heatmap));
    expect([back.width, back.height]).toEqual([base.width, base.height]);
    expect(back.data).toEqual(heatmap.data);
  });
});
