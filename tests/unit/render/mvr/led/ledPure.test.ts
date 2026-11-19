/** The LED wall rules that need no renderer: placeholder images, the level scale and duplicates. */
import { describe, expect, it } from 'vitest';
import { duplicatePanels } from '../../../../../src/render/mvr/led/ledClusters.ts';
import { LED_WHITE_PEAK, ledRadiance } from '../../../../../src/render/mvr/led/ledLevel.ts';
import { isPlaceholderImage } from '../../../../../src/render/mvr/led/ledPlaceholder.ts';
import type { PanelPose, V3 } from '../../../../../src/render/mvr/led/ledPose.ts';
import { LENS_PEAK } from '../../../../../src/render/post/emitters.ts';
import { BLOOM, MVR_EXPOSURE } from '../../../../../src/render/post/mvrTone.ts';

/** A standing panel that faces +Z, with its local x along `x` (so a panel can be turned in its own plane). */
const panel = (position: V3, x: V3 = [1, 0, 0], pitch = 0.5): PanelPose => {
  const z: V3 = x[0] !== 0 ? [0, -x[0], 0] : [x[1], 0, 0];
  return { position, x, z, normal: [0, 0, 1], pitch };
};

describe('isPlaceholderImage', () => {
  it('takes the Vectorworks default image and test cards by name, and tiny images by size', () => {
    expect(isPlaceholderImage({ name: 'Vectorworks Logo RT.png' })).toBe(true);
    expect(isPlaceholderImage({ name: 'textures/test_pattern.jpg', width: 1920, height: 1080 })).toBe(true);
    expect(isPlaceholderImage({ name: 'swatch.png', width: 8, height: 8 })).toBe(true);
  });

  it('keeps real content, also while its size is not known yet', () => {
    expect(isPlaceholderImage({ name: 'opening-loop.png', width: 1920, height: 1080 })).toBe(false);
    expect(isPlaceholderImage({ name: 'contest-winner.png' })).toBe(false);
    expect(isPlaceholderImage({})).toBe(false);
  });
});

describe('ledRadiance', () => {
  it('puts a white wall at 100 % at 6 to 8 times the bloom threshold, far below a lens, and is linear', () => {
    const full = ledRadiance(100) * MVR_EXPOSURE;
    expect(full / BLOOM.threshold).toBeGreaterThanOrEqual(6);
    expect(full / BLOOM.threshold).toBeLessThanOrEqual(8);
    expect(full).toBeCloseTo(LED_WHITE_PEAK);
    expect(LENS_PEAK / full).toBeGreaterThan(4);
    expect(ledRadiance(25)).toBeCloseTo(ledRadiance(100) / 4);
    expect([ledRadiance(0), ledRadiance(-5), ledRadiance(Number.NaN)]).toEqual([0, 0, 0]);
    expect(ledRadiance(250)).toBe(ledRadiance(100));
  });
});

describe('duplicatePanels', () => {
  it('names a later coplanar panel within millimetres, and only that one', () => {
    const panels = [
      panel([0, 1, 0]),
      panel([0.5, 1, 0]),
      panel([0.002, 1, 0.001]),
      panel([0.5, 1, 0.2]),
      { ...panel([0, 1, 0.001]), normal: [1, 0, 0] as V3 },
      panel([0.001, 1.001, 0]),
    ];
    expect([...duplicatePanels(panels)]).toEqual([
      [2, 0],
      [5, 0],
    ]);
  });

  it('makes one group of a chain: a panel 3 mm off two that are 6 mm apart joins them to the first', () => {
    const panels = [panel([0, 1, 0]), panel([0.006, 1, 0]), panel([0.003, 1, 0])];
    expect([...duplicatePanels(panels)]).toEqual([
      [1, 0],
      [2, 0],
    ]);
  });
});
