import { describe, expect, it } from 'vitest';
import { MA_SIZE, maZoom, zoomFactor } from '../../../../src/ui/layouts/fitMath';

describe('zoomFactor', () => {
  it('uses a fixed zoom as given', () => expect(zoomFactor('.85', 3000, 1880, 0.66)).toBe(0.85));
  it('scales auto by window width within its bounds', () => {
    expect(zoomFactor('auto', 1904, 1880, 0.66)).toBe(1);
    expect(zoomFactor('auto', 500, 1880, 0.66)).toBe(0.66);
    expect(zoomFactor('auto', 5000, 1880, 0.66)).toBe(1.05);
  });
});

describe('maZoom', () => {
  const geo = { W: 1000, H: 500, mt: 0, mb: 0 };
  it('fits the default share of the height', () => expect(maZoom(geo, undefined, 4000, 1040)).toBeCloseTo(MA_SIZE * 2));
  it('uses the grip share when set', () => expect(maZoom(geo, 0.3, 4000, 1040)).toBeCloseTo(0.6));
  it('is limited by the window width', () => expect(maZoom(geo, undefined, 500, 1040)).toBeCloseTo(0.49));
});
