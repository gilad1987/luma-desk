/** The bound on the radiance of a lens that points into the camera. */
import { afterEach, describe, expect, it } from 'vitest';
import { emitters, lensGain } from '../../../../src/render/post/emitters';
import { LENS_CAP, boundedLensGain } from '../../../../src/render/post/lensBound';
import { BLOOM, MVR_EXPOSURE } from '../../../../src/render/post/mvrTone';

/** The lens value on screen, in exposure-adjusted units, for a white lens at this dimmer. */
const shown = (dimmer: number): number => dimmer * boundedLensGain(lensGain(3), dimmer) * MVR_EXPOSURE;

describe('the bound of a lens in the HDR model', () => {
  afterEach(() => {
    emitters.isHdr = false;
  });

  it('leaves the legacy gain as it is, bit for bit', () => {
    expect(boundedLensGain(3, 1)).toBe(3);
    expect(boundedLensGain(2.2, 0.37)).toBe(2.2);
  });

  it('never passes the cap, at full and for a value over the range', () => {
    emitters.isHdr = true;
    for (const dimmer of [0.05, 0.25, 0.5, 1, 4]) expect(shown(dimmer)).toBeLessThanOrEqual(LENS_CAP);
    // 12 * (1 - exp(-32 / 12)): a full lens was 32
    expect(shown(1)).toBeCloseTo(11.166, 3);
    expect(shown(4)).toBeCloseTo(12, 3);
  });

  it('keeps a full lens white-hot: past the end of the bloom knee', () => {
    emitters.isHdr = true;
    expect(shown(1)).toBeGreaterThan(2 * (BLOOM.threshold + BLOOM.knee));
  });

  it('stays linear for a dim lens and grows with the dimmer, so the bloom follows the level', () => {
    emitters.isHdr = true;
    // the linear value at 1 % is 0.32
    expect(shown(0.01)).toBeCloseTo(0.32, 2);
    expect(shown(0.05)).toBeGreaterThan(BLOOM.threshold);
    for (let dimmer = 0.1; dimmer <= 1; dimmer += 0.1) expect(shown(dimmer)).toBeGreaterThan(shown(dimmer - 0.05));
  });

  it('gives a dark lens the linear gain, with no division by zero', () => {
    emitters.isHdr = true;
    expect(boundedLensGain(lensGain(3), 0)).toBe(lensGain(3));
  });
});
