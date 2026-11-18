import type { Bvh } from './Bvh';
import type { Ray } from './Ray';

/** What a leaf holds: it tests one primitive and, on a nearer hit, lowers `ray.t` and sets `ray.prim`. */
export interface Leaf {
  test(prim: number, ray: Ray): void;
}

/** The distance at which the ray enters the box at `at`, or Infinity when it misses it or enters past `ray.t`. */
function entry(bounds: Float32Array, at: number, ray: Ray): number {
  const x0 = ((bounds[at] ?? 0) - ray.ox) * ray.ix;
  const x1 = ((bounds[at + 3] ?? 0) - ray.ox) * ray.ix;
  const y0 = ((bounds[at + 1] ?? 0) - ray.oy) * ray.iy;
  const y1 = ((bounds[at + 4] ?? 0) - ray.oy) * ray.iy;
  const z0 = ((bounds[at + 2] ?? 0) - ray.oz) * ray.iz;
  const z1 = ((bounds[at + 5] ?? 0) - ray.oz) * ray.iz;
  const near = Math.max(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), 0);
  const far = Math.min(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1), ray.t);
  return near <= far ? near : Infinity;
}

/**
 * Walks the ray through the hierarchy and gives every primitive of each leaf it enters to `leaf`. The nearer child
 * goes first, so a hit there lowers `ray.t` and the farther child is mostly cut off. `stack` holds `STACK_SIZE`
 * slots and belongs to the caller: a walk inside a leaf test (an instance walking its mesh) needs its own.
 */
export function walk(bvh: Bvh, ray: Ray, leaf: Leaf, stack: Uint32Array): void {
  const { bounds, links, order } = bvh;
  if (entry(bounds, 0, ray) === Infinity) return;
  let top = 0;
  let node = 0;
  for (;;) {
    const first = links[node * 2] ?? 0;
    const count = links[node * 2 + 1] ?? 0;
    if (count > 0) {
      for (let i = first; i < first + count; i++) leaf.test(order[i] ?? 0, ray);
    } else {
      const left = entry(bounds, first * 6, ray);
      const right = entry(bounds, first * 6 + 6, ray);
      const isLeftNear = left < right;
      if (Math.max(left, right) !== Infinity) stack[top++] = isLeftNear ? first + 1 : first;
      if (Math.min(left, right) !== Infinity) {
        node = isLeftNear ? first : first + 1;
        continue;
      }
    }
    if (top === 0) return;
    node = stack[--top] ?? 0;
  }
}
