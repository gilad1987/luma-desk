/**
 * Owns the contract the pan and tilt wiring must keep (docs/mvr-fixture-frames.md, "The sign of pan and tilt"): two
 * heads whose makers write the Tilt range in opposite order aim to mirrored sides at the same DMX value. The mapping
 * is not wired into the frame update yet; this pins it for the change that wires it. All ranges are invented.
 */
import { describe, expect, it } from 'vitest';
import { physicalAngle } from '../../../../src/render/fixtures/sync/physicalAngle';

const DESK_TILT = { physicalFrom: -135, physicalTo: 135 };
const FORWARD = { physicalFrom: -135, physicalTo: 135 };
const REVERSED = { physicalFrom: 135, physicalTo: -135 };

describe('physicalAngle of a tilt axis', () => {
  it('is mirrored at every DMX value for Tilt -135 to 135 and Tilt 135 to -135', () => {
    for (const share of [0, 0.1, 0.25, 0.6, 1]) {
      const [forward, reversed] = [FORWARD, REVERSED].map((range) => physicalAngle(share, range, DESK_TILT));
      expect(reversed).toBeCloseTo(-(forward ?? NaN), 9);
    }
    expect(physicalAngle(0.25, FORWARD, DESK_TILT)).toBeCloseTo(-67.5, 9);
    expect(physicalAngle(0.25, REVERSED, DESK_TILT)).toBeCloseTo(67.5, 9);
  });

  it('meets at the centre of the range, where both heads look along the yoke axis', () => {
    expect(physicalAngle(0.5, FORWARD, DESK_TILT)).toBeCloseTo(0, 9);
    expect(physicalAngle(0.5, REVERSED, DESK_TILT)).toBeCloseTo(0, 9);
  });
});
