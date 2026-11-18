import { describe, expect, it } from 'vitest';
import { tipPlacement, type Box } from '../../../../src/ui/guide/tourGeometry';

const box = (left: number, top: number, width: number, height: number): Box => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

describe('tipPlacement', () => {
  it('puts the tip under the target, centred', () => {
    expect(tipPlacement(box(400, 100, 100, 50), 120, 1600, 900)).toEqual({ left: 280, top: 164 });
  });

  it('puts the tip above a target near the bottom', () => {
    expect(tipPlacement(box(400, 800, 100, 50), 120, 1600, 900)).toEqual({ left: 280, top: 666 });
  });

  it('overlaps a tall target and aligns left on a wide one', () => {
    expect(tipPlacement(box(10, 20, 1200, 860), 120, 1600, 900)).toEqual({ left: 30, top: 34 });
  });
});
