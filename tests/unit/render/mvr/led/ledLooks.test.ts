/** The generated LED content: its clock, the looks on offer, their peak, and the colour they give the wall light. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LED_CONTENT_PEAK, ledContentAt } from '../../../../../src/render/mvr/led/ledContent.ts';
import { LED_LOOKS_GLSL } from '../../../../../src/render/mvr/led/ledLooksGlsl.ts';
import {
  LED_LOOKS,
  ledLook,
  ledUniforms,
  setLedLook,
  setLedWallPercent,
  syncLedTime,
} from '../../../../../src/render/mvr/led/ledUniforms.ts';
import { wallColour } from '../../../../../src/render/mvr/led/ledWallColour.ts';

afterEach(() => setLedWallPercent(25));

describe('syncLedTime', () => {
  it('takes the content time from performance.now, the clock that ?test freezes and steps', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(12_500);
    syncLedTime();
    expect(ledUniforms.uLedTime.value).toBe(12.5);
    now.mockRestore();
  });
});

describe('LED content looks', () => {
  afterEach(() => setLedLook('fields'));

  it('offers three looks, keeps the look for an unknown name, and never reaches past the content peak', () => {
    expect(LED_LOOKS).toEqual(['fields', 'bars', 'bokeh']);
    setLedLook('bokeh');
    setLedLook('logo');
    expect([ledLook(), ledUniforms.uLedLook.value]).toEqual(['bokeh', 2]);
    const white: readonly [number, number, number][] = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];
    const peaks = [0, 3, 7, 11].flatMap((u) => [0, 2, 5].map((v) => Math.max(...ledContentAt(u, v, u + v, white))));
    expect(Math.max(...peaks)).toBeLessThanOrEqual(LED_CONTENT_PEAK);
    expect(LED_LOOKS_GLSL).toContain(`#define LED_PEAK ${LED_CONTENT_PEAK}`);
  });

  it('gives the wall light the mean colour of the look on screen', () => {
    setLedWallPercent(100);
    for (const look of LED_LOOKS) {
      setLedLook(look);
      const [r, g, b] = wallColour({ width: 12, height: 6, seed: 0 });
      expect(Math.max(r, g, b)).toBeGreaterThan(0);
      expect(Math.max(r, g, b)).toBeLessThan(ledUniforms.uLedLevel.value * LED_CONTENT_PEAK);
    }
  });
});
