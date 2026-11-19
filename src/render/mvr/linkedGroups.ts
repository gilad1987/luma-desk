import type { Vec3 } from '../../domain/stage/types';

/** The root of `i` in a union-find forest, with the path to it shortened. */
function rootOf(parent: number[], i: number): number {
  let root = i;
  while ((parent[root] ?? root) !== root) root = parent[root] ?? root;
  let step = i;
  while (step !== root) {
    const next = parent[step] ?? root;
    parent[step] = root;
    step = next;
  }
  return root;
}

/**
 * The single-linkage groups of `points` in plan (x and z): two points are in one group when a chain of points joins
 * them whose steps are each at most `gap` long. The groups, and the points in each, keep the order of `points`, and
 * which points share a group does not depend on that order. It compares every pair once, which is fast enough for the
 * few thousand fixtures of a large file and runs only when the views are fitted.
 */
export function linkedGroups(points: readonly Vec3[], gap: number): Vec3[][] {
  const parent = points.map((_, i) => i);
  points.forEach((a, i) => {
    for (let j = i + 1; j < points.length; j++) {
      const b = points[j];
      if (b && Math.hypot(a[0] - b[0], a[2] - b[2]) <= gap) parent[rootOf(parent, j)] = rootOf(parent, i);
    }
  });
  const groups = new Map<number, Vec3[]>();
  points.forEach((point, i) => {
    const root = rootOf(parent, i);
    groups.set(root, [...(groups.get(root) ?? []), point]);
  });
  return [...groups.values()];
}
