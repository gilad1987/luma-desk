/**
 * Owns the mapping from a DMX value to the physical angle of a pan or tilt axis through the fixture's own GDTF
 * range, with the sign of the maker, and the desk default for a fixture without one. All ranges are invented.
 */
import { describe, expect, it } from 'vitest';
import { physicalAngle, type PanTiltRanges } from '../../../../src/render/fixtures/sync/physicalAngle';

const DESK_PAN = { physicalFrom: -270, physicalTo: 270 };
const DESK_TILT = { physicalFrom: -135, physicalTo: 135 };
/** One maker counts pan up with the DMX value, another counts it down; the second gives no tilt range. */
const RISING: PanTiltRanges = {
  pan: { physicalFrom: -270, physicalTo: 270 },
  tilt: { physicalFrom: -125, physicalTo: 125 },
};
const FALLING: PanTiltRanges = { pan: { physicalFrom: 270, physicalTo: -270 } };

describe('physicalAngle', () => {
  it('follows PhysicalFrom to PhysicalTo of a maker whose pan rises with the DMX value', () => {
    expect([0, 0.25, 0.5, 1].map((share) => physicalAngle(share, RISING.pan, DESK_PAN))).toEqual([-270, -135, 0, 270]);
    expect(physicalAngle(1, RISING.tilt, DESK_TILT)).toBe(125);
  });

  it('turns the other way for a maker whose pan falls with the DMX value', () => {
    expect([0, 0.25, 0.5, 1].map((share) => physicalAngle(share, FALLING.pan, DESK_PAN))).toEqual([270, 135, 0, -270]);
  });

  it('uses the desk default for an axis the fixture gives no range for, and clamps the share', () => {
    expect(physicalAngle(0.75, FALLING.tilt, DESK_TILT)).toBe(67.5);
    expect([-1, 2].map((share) => physicalAngle(share, undefined, DESK_PAN))).toEqual([-270, 270]);
  });
});
