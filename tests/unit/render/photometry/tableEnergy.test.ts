import { describe, expect, it } from 'vitest';
import { D2R } from '../../../../src/core';
import {
  GAUSSIAN_FIELD_RATIO,
  candela,
  illuminance,
  lumens,
  peakCandela,
  profileAt,
  resolveBeamProfile,
  zoomAt,
  type ZoomState,
} from '../../../../src/render/photometry';
import { expectWithin, midpoint } from './within';

const FLUX = lumens(10_000);

/** The lumens that land on a flat wall 20 m away, summed over rings out to 80 degrees off the axis. */
function wallFlux(state: ZoomState): number {
  const profile = resolveBeamProfile(state.beamAngleDeg, state.fieldAngleDeg);
  const peak = peakCandela(state.flux, profile);
  const wall = 20;
  const ring = (radius: number): number => {
    const range = Math.hypot(wall, radius);
    const toward = candela(peak * profileAt(profile, Math.atan2(radius, wall)));
    return illuminance(toward, range, wall / range) * 2 * Math.PI * radius;
  };
  return midpoint(ring, 0, wall * Math.tan(80 * D2R), 40_000);
}

describe('photometry validation table: energy', () => {
  it.each([1.2, 1.823, 3])('the profile over the sphere holds the flux for field / beam = %s', (ratio) => {
    for (const beamDeg of [1, 10, 40]) {
      const profile = resolveBeamProfile(beamDeg, beamDeg * ratio);
      const peak = peakCandela(FLUX, profile);
      const rings = (theta: number): number => profileAt(profile, theta) * Math.sin(theta);
      // behind the lens the profile is 0, so the forward hemisphere is the whole sphere
      const overSphere = 2 * Math.PI * peak * midpoint(rings, 0, Math.PI, 400_000);
      expectWithin(overSphere, FLUX);
    }
  });

  it('gives n = 2 at field / beam = 1.823', () => {
    expect(resolveBeamProfile(10, 18.23).exponent).toBeCloseTo(2, 2);
    expect(GAUSSIAN_FIELD_RATIO).toBeCloseTo(1.8226, 4);
  });

  it('a zoom from 10 to 40 degrees at constant flux puts the same flux on a far wall, within 2 %', () => {
    const ends = { narrowFieldDeg: 10, wideFieldDeg: 40, beamToField: 1 / GAUSSIAN_FIELD_RATIO };
    const narrow = zoomAt(ends, 0, FLUX);
    const wide = zoomAt(ends, 1, FLUX);
    expect(narrow.fieldAngleDeg).toBe(10);
    expect(wide.fieldAngleDeg).toBe(40);
    expectWithin(wallFlux(narrow), FLUX, 0.02);
    expectWithin(wallFlux(wide), FLUX, 0.02);
    expectWithin(wallFlux(wide), wallFlux(narrow), 0.02);
  });

  it('the peak intensity follows the zoom angle: about 1 / 16 from 10 to 40 degrees', () => {
    const ends = { narrowFieldDeg: 10, wideFieldDeg: 40, beamToField: 1 / GAUSSIAN_FIELD_RATIO };
    const peakAt = (zoom: number): number => {
      const state = zoomAt(ends, zoom, FLUX);
      return peakCandela(state.flux, resolveBeamProfile(state.beamAngleDeg, state.fieldAngleDeg));
    };
    expect(peakAt(0) / peakAt(1)).toBeGreaterThan(15);
    expect(peakAt(0) / peakAt(1)).toBeLessThan(16.5);
    expect(peakAt(0.5)).toBeLessThan(peakAt(0));
    expect(peakAt(0.5)).toBeGreaterThan(peakAt(1));
  });

  it('uses the flux of each zoom end, linearly between them, when the maker gives both', () => {
    const ends = { narrowFieldDeg: 10, wideFieldDeg: 40, beamToField: 0.6, narrowFlux: 8_000, wideFlux: 12_000 };
    expect(zoomAt(ends, 0, FLUX).flux).toBe(8_000);
    expect(zoomAt(ends, 0.5, FLUX).flux).toBe(10_000);
    expect(zoomAt(ends, 2, FLUX).flux).toBe(12_000);
    expect(zoomAt(ends, 0.5, FLUX).beamAngleDeg).toBeCloseTo(15, 12);
    // one end alone is not a curve: the flux of the fixture is kept
    expect(zoomAt({ ...ends, narrowFlux: 8_000, wideFieldDeg: 40, beamToField: 0.6 }, 0, lumens(5)).flux).toBe(8_000);
  });
});
