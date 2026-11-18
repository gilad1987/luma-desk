import { describe, expect, it } from 'vitest';
import { D2R } from '../../../../src/core';
import { beamDiameter, footprintEllipse } from '../../../../src/render/photometry';

/**
 * The footprint by brute force: rays on the cone surface from an apex at the origin, cut by the plane through
 * (0, 0, distance) whose normal is tilted by the incidence angle in the x-z plane. Returns the extent of the hits
 * along the tilt direction (in the plane) and across it.
 */
function tracedFootprint(distance: number, angleDeg: number, incidenceDeg: number): { along: number; across: number } {
  const theta = (angleDeg / 2) * D2R;
  const tilt = incidenceDeg * D2R;
  const normal = [Math.sin(tilt), 0, Math.cos(tilt)] as const;
  let near = Infinity;
  let far = -Infinity;
  let across = 0;
  for (let i = 0; i < 20_000; i++) {
    const phi = (i / 20_000) * 2 * Math.PI;
    const ray = [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)] as const;
    const t = (distance * normal[2]) / (ray[0] * normal[0] + ray[2] * normal[2]);
    // the in-plane axis along the tilt is (cos, 0, -sin); the hit point is measured from (0, 0, distance)
    const along = t * ray[0] * Math.cos(tilt) - (t * ray[2] - distance) * Math.sin(tilt);
    near = Math.min(near, along);
    far = Math.max(far, along);
    across = Math.max(across, Math.abs(t * ray[1]));
  }
  return { along: (far - near) / 2, across };
}

describe('beam geometry', () => {
  it('grows by 2 d tan(theta) on top of the lens diameter', () => {
    expect(beamDiameter(0, 10, 0.05)).toBeCloseTo(0.1, 12);
    expect(beamDiameter(10, 90)).toBeCloseTo(20, 9);
    expect(beamDiameter(-3, 10, 0.05)).toBeCloseTo(0.1, 12);
  });

  it('is a circle of the beam diameter on a plane square to the beam', () => {
    const footprint = footprintEllipse(10, 10, 0, 0.05);
    expect(footprint?.semiMajor).toBeCloseTo(beamDiameter(10, 10, 0.05) / 2, 9);
    expect(footprint?.semiMinor).toBeCloseTo(beamDiameter(10, 10, 0.05) / 2, 9);
    expect(footprint?.centreOffset).toBe(0);
  });

  it.each([
    [10, 30],
    [10, 60],
    [40, 45],
    [25, -50],
  ])('matches the traced cone for a %s degree beam at %s degrees incidence', (angle, incidence) => {
    const footprint = footprintEllipse(8, angle, incidence);
    const traced = tracedFootprint(8, angle, incidence);
    expect(footprint?.semiMajor).toBeCloseTo(traced.along, 5);
    expect(footprint?.semiMinor).toBeCloseTo(traced.across, 5);
  });

  it('puts the centre of the ellipse beyond the axis hit point, by half the difference of far and near edge', () => {
    const theta = 10 * D2R;
    const tilt = 50 * D2R;
    const far = (8 * Math.sin(theta)) / Math.cos(tilt + theta);
    const near = (8 * Math.sin(theta)) / Math.cos(tilt - theta);
    const footprint = footprintEllipse(8, 20, 50);
    expect(footprint?.centreOffset).toBeCloseTo((far - near) / 2, 9);
    expect(footprint?.semiMajor).toBeCloseTo((far + near) / 2, 9);
  });

  it('is the same for a tilt to either side and longer than wide', () => {
    expect(footprintEllipse(8, 20, -35)).toEqual(footprintEllipse(8, 20, 35));
    const footprint = footprintEllipse(8, 20, 35);
    expect(footprint?.semiMajor).toBeGreaterThan(footprint?.semiMinor ?? Infinity);
  });

  it('has no closed footprint when the far edge of the beam runs parallel to the plane or away from it', () => {
    expect(footprintEllipse(8, 20, 79)).toBeDefined();
    expect(footprintEllipse(8, 20, 80)).toBeUndefined();
    expect(footprintEllipse(8, 20, 89)).toBeUndefined();
    expect(footprintEllipse(8, 180, 0)).toBeUndefined();
    expect(footprintEllipse(8, 20, NaN)).toBeUndefined();
  });
});
