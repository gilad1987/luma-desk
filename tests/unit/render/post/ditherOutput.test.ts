import { describe, expect, it } from 'vitest';
import { DITHER_GLSL, DITHER_STEP, ditherAt, withDither } from '../../../../src/render/post/ditherOutput';

describe('the dither of the MVR output', () => {
  it('spans plus and minus half an 8-bit step around zero', () => {
    let sum = 0;
    let low = 1;
    let high = -1;
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const value = ditherAt(x, y);
        sum += value;
        low = Math.min(low, value);
        high = Math.max(high, value);
      }
    }
    expect(DITHER_STEP).toBe(1 / 255);
    expect(low).toBeGreaterThanOrEqual(-0.5 * DITHER_STEP);
    expect(high).toBeLessThan(0.5 * DITHER_STEP);
    expect(high - low).toBeGreaterThan(0.99 * DITHER_STEP);
    expect(Math.abs(sum / (128 * 128))).toBeLessThan(0.01 * DITHER_STEP);
  });

  it('turns a gradient of less than one step into a mix of the two levels with the right mean', () => {
    // a flat field at 10.3 / 255: without the dither every pixel rounds to 10
    let sum = 0;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) sum += Math.round((10.3 / 255 + ditherAt(x, y)) * 255);
    expect(sum / (64 * 64)).toBeCloseTo(10.3, 1);
    // black stays black: less than half a step never rounds up
    expect(Math.round(Math.max(0, ditherAt(3, 5)) * 255)).toBe(0);
  });

  it('is a function of the pixel alone, added as the last statement of the stage', () => {
    expect(ditherAt(17, 40)).toBe(ditherAt(17, 40));
    expect(DITHER_GLSL).not.toMatch(/time|frame|seed/i);
    expect(DITHER_GLSL).toContain('( grain - 0.5 ) / 255.0');
    const source = withDither('void main() {\n\tgl_FragColor = sRGBTransferOETF( gl_FragColor );\n}\n');
    expect(source.indexOf('sRGBTransferOETF')).toBeLessThan(source.indexOf('grain - 0.5'));
    expect(source.trimEnd().endsWith('}')).toBe(true);
    expect(source.match(/\}/g)).toHaveLength(1);
  });
});
