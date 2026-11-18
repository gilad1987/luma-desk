/**
 * isPanelShape: a mesh is a standing panel when it is thin along one of its own axes and that axis is level in the
 * MVR world (Z up). Boxes are in millimetres, as mesh bounds are.
 */
import { describe, expect, it } from 'vitest';
import type { Aabb } from '../../../src/mvr/math/Aabb.ts';
import { identity, type Mat4 } from '../../../src/mvr/math/Mat4.ts';
import { isPanelShape } from '../../../src/mvr/scene/isPanelShape.ts';

const box = (x: number, y: number, z: number): Aabb => ({ min: [0, 0, 0], max: [x, y, z] });

/** Columns of a rotation by `degrees` about the vertical axis, with a uniform `scale`. */
function turned(degrees: number, scale = 1): Mat4 {
  const angle = (degrees * Math.PI) / 180;
  const [cos, sin] = [Math.cos(angle) * scale, Math.sin(angle) * scale];
  return Float64Array.from([cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, scale, 0, 0, 0, 0, 1]);
}

/** Columns that lay the local Y axis along world Z: a wall modelled standing is laid flat. */
const LAID_FLAT: Mat4 = Float64Array.from([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]);

describe('isPanelShape', () => {
  it('takes a thin standing wall, also when it is turned or scaled', () => {
    expect(isPanelShape(box(6000, 100, 3000), identity())).toBe(true);
    expect(isPanelShape(box(100, 6000, 3000), identity())).toBe(true);
    expect(isPanelShape(box(6000, 100, 3000), turned(35))).toBe(true);
    expect(isPanelShape(box(6, 0.1, 3), turned(0, 1000))).toBe(true);
    expect(isPanelShape(box(4000, 0, 2000), identity())).toBe(true);
  });

  it('refuses a deck and a wall laid flat: thin, but the thin axis points up', () => {
    expect(isPanelShape(box(12000, 8000, 300), identity())).toBe(false);
    expect(isPanelShape(box(6000, 100, 3000), LAID_FLAT)).toBe(false);
  });

  it('refuses a solid, stairs and the deep box of a curved wall', () => {
    expect(isPanelShape(box(2000, 1500, 1000), identity())).toBe(false);
    expect(isPanelShape(box(10000, 3000, 4000), identity())).toBe(false);
    expect(isPanelShape(box(1000, 1000, 1000), identity())).toBe(false);
  });

  it('refuses a mesh without size', () => {
    expect(isPanelShape(box(0, 0, 0), identity())).toBe(false);
  });
});
