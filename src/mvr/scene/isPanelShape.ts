import type { Aabb, Point3 } from '../math/Aabb';
import { transformPoint, type Mat4 } from '../math/Mat4';

/**
 * A panel is at most this deep, as a part of its next larger side. LED tiles with their frame are about 0.1 m deep
 * and a wall is rarely narrower than 0.5 m, while a stair block or a rostrum is nearly as deep as it is wide.
 */
const THIN_RATIO = 0.25;

/**
 * How far the thin axis may point up or down, as the sine of its angle to the floor (0.5 is 30 degrees). A wall
 * stands, so its thin axis is level; a deck or a riser top is as thin, but it lies, and its thin axis points up.
 */
const MAX_RISE = 0.5;

/** One local axis of the mesh in the world: how long the box is along it, and how much it points up or down. */
interface WorldAxis {
  readonly size: number;
  readonly rise: number;
}

function worldAxis(box: Aabb, matrix: Mat4, axis: 0 | 1 | 2): WorldAxis {
  const unit: [number, number, number] = [0, 0, 0];
  unit[axis] = 1;
  const origin = transformPoint(matrix, [0, 0, 0]);
  const tip = transformPoint(matrix, unit);
  const along: Point3 = [tip[0] - origin[0], tip[1] - origin[1], tip[2] - origin[2]];
  // the placement can scale the mesh, so the box size is taken to world units before the sides are compared
  const scale = Math.hypot(...along);
  return { size: (box.max[axis] - box.min[axis]) * scale, rise: scale > 0 ? Math.abs(along[2]) / scale : 1 };
}

/**
 * Whether a mesh placed by `matrix` has the shape of a standing panel: thin along one of its own axes, and that axis
 * level. `box` is the mesh's local bounds and `matrix` takes it to the MVR world (Z up), so a wall turned about the
 * vertical axis still counts, where its world-aligned box would not be thin. It reads the bounding box only: a curved
 * wall has a deep box and is not a panel here, and a panel that lies flat (an LED floor) is not one either, because
 * its box is that of a deck.
 */
export function isPanelShape(box: Aabb, matrix: Mat4): boolean {
  const axes = ([0, 1, 2] as const).map((axis) => worldAxis(box, matrix, axis)).sort((a, b) => a.size - b.size);
  const [depth, side] = axes;
  if (depth === undefined || side === undefined) return false;
  return side.size > 0 && depth.size <= side.size * THIN_RATIO && depth.rise <= MAX_RISE;
}
