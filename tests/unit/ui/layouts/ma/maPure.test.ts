/**
 * The pure parts of the MA console hardware: colour marker, grip share, wheel steps. The widgets' DOM wiring is
 * covered by the Playwright parity suite, not here.
 */
import { describe, expect, it } from 'vitest';
import { gripShare } from '../../../../../src/ui/layouts/fitMath';
import { colorMarker } from '../../../../../src/ui/layouts/ma/colorMarker';
import { wheelSteps } from '../../../../../src/ui/layouts/ma/paneWheelScroll';

describe('colorMarker', () => {
  it('places pure red, green, blue and white where the original hue formula did', () => {
    expect([colorMarker(255, 0, 0), colorMarker(0, 255, 0), colorMarker(0, 0, 255), colorMarker(9, 9, 9)]).toEqual([
      { left: 0, top: 0 },
      { left: (2 / 6) * 100, top: 0 },
      { left: (4 / 6) * 100, top: 0 },
      { left: 0, top: 100 },
    ]);
  });

  it('wraps a magenta hue into the last sixth instead of going negative', () => {
    expect(colorMarker(255, 0, 128).left).toBeCloseTo(((6 - 128 / 255) / 6) * 100);
  });
});

describe('gripShare', () => {
  it('measures the space under the grip and keeps it between 30% and 70%', () => {
    expect([gripShare(540, 1040), gripShare(1000, 1040), gripShare(0, 1040)]).toEqual([0.5, 0.3, 0.7]);
  });
});

describe('wheelSteps', () => {
  it('carries pixel deltas until a whole 20 px step and counts lines as 20 px each', () => {
    expect([wheelSteps(0, 15, 0), wheelSteps(15, 10, 0), wheelSteps(0, -3, 1)]).toEqual([
      [15, 0],
      [5, 1],
      [0, -3],
    ]);
  });
});
