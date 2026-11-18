/**
 * The lens radiance mapping of the two emitter models, the bloom units and the depth linearisation.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { emitters, flareGain, lensGain } from '../../../../src/render/post/emitters';
import { BLOOM, MVR_EXPOSURE, toBufferUnits } from '../../../../src/render/post/mvrTone';
import { viewDistance } from '../../../../src/render/post/SceneDepth';

/** Lens radiance of a white lens at `dimmer`, as a multiple of the bloom threshold after exposure. */
const overThreshold = (dimmer: number): number => (dimmer * lensGain(3) * MVR_EXPOSURE) / BLOOM.threshold;

afterEach(() => (emitters.isHdr = false));

describe('emitter models', () => {
  it('keeps the legacy gains bit for bit on a built-in stage', () => {
    expect([lensGain(3), lensGain(2.2), flareGain()]).toEqual([3, 2.2, 1]);
  });

  it('puts a full lens 10 to 50 times above the bloom threshold in the HDR model', () => {
    emitters.isHdr = true;
    expect(overThreshold(1)).toBeGreaterThanOrEqual(10);
    expect(overThreshold(1)).toBeLessThanOrEqual(50);
  });

  it('keeps a lens at 5 % in the low half of the bloom knee, so it barely blooms', () => {
    emitters.isHdr = true;
    expect(overThreshold(0.05)).toBeGreaterThan(1);
    expect(overThreshold(0.05)).toBeLessThan(1 + BLOOM.knee / 2);
  });

  it('keeps radiance linear in the dimmer and the pixel strip in its legacy ratio to the lens', () => {
    emitters.isHdr = true;
    expect(overThreshold(0.5)).toBeCloseTo(overThreshold(1) / 2, 10);
    expect(lensGain(2.2) / lensGain(3)).toBeCloseTo(2.2 / 3, 10);
  });

  it('scales the flare sprite down in the HDR model, where the bloom makes the halo', () => {
    emitters.isHdr = true;
    expect(flareGain()).toBeLessThanOrEqual(0.25);
  });
});

describe('MVR tone units', () => {
  it('gives the bloom threshold in buffer units: a buffer value at the threshold is 1 after exposure', () => {
    expect(toBufferUnits(BLOOM.threshold) * MVR_EXPOSURE).toBeCloseTo(1, 10);
  });
});

describe('viewDistance', () => {
  it('maps depth 0 to the near plane and depth 1 to the far plane, and is not linear between', () => {
    expect(viewDistance(0, 0.5, 400)).toBeCloseTo(0.5, 10);
    expect(viewDistance(1, 0.5, 400)).toBeCloseTo(400, 8);
    expect(viewDistance(0.5, 0.5, 400)).toBeCloseTo(0.9988, 3);
  });
});
