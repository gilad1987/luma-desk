import { describe, expect, it } from 'vitest';
import { MAX_CCT, MIN_CCT, cctToXy } from '../../../../src/render/photometry';

describe('colour temperature to chromaticity', () => {
  it('follows the Planckian locus within 0.001 at the reference points', () => {
    // 2856 K is CIE illuminant A, (0.4476, 0.4074); the fit has its largest error near here
    expect(Math.abs(cctToXy(2856).x - 0.4476)).toBeLessThan(1e-3);
    expect(Math.abs(cctToXy(2856).y - 0.4074)).toBeLessThan(1e-3);
    expect(Math.abs(cctToXy(6500).x - 0.3135)).toBeLessThan(1e-3);
    expect(Math.abs(cctToXy(6500).y - 0.3237)).toBeLessThan(1e-3);
  });

  it('limits the temperature to the range of the fit', () => {
    expect([MIN_CCT, MAX_CCT]).toEqual([1667, 25_000]);
    expect(cctToXy(100)).toEqual(cctToXy(1667));
    expect(cctToXy(90_000)).toEqual(cctToXy(25_000));
  });

  it('has pieces that meet within 0.0002 at 4000 K and at 2222 K', () => {
    // the published fit is not exactly continuous: x steps by about 0.00007 at 4000 K, far below what an eye sees
    const step = (kelvin: number, axis: 'x' | 'y'): number =>
      Math.abs(cctToXy(kelvin + 0.1)[axis] - cctToXy(kelvin - 0.1)[axis]);
    expect(step(4000, 'x')).toBeLessThan(2e-4);
    expect(step(4000, 'y')).toBeLessThan(2e-4);
    expect(step(2222, 'y')).toBeLessThan(2e-4);
  });

  it('moves from red to blue as the temperature rises', () => {
    for (let kelvin = 1700; kelvin < 25_000; kelvin += 100) {
      expect(cctToXy(kelvin + 100).x).toBeLessThan(cctToXy(kelvin).x);
    }
  });
});
