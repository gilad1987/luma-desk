/** A point or an offset in the MVR frame (millimetres, Z up). */
export type V3 = readonly [number, number, number];

export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length = (v: V3): number => Math.hypot(v[0], v[1], v[2]);

/** Placements closer than this (mm) are one place: CAD files stack copies, and a copy is not a grid neighbour. */
const SAME_PLACE = 1;

/** The points whose nearest neighbour is measured. The median of 256 is stable, and all pairs of 5000 are not needed. */
const SAMPLE = 256;

/**
 * The spacing of a point set: the median distance from a point to its nearest neighbour, over an even sample of the
 * points. The median ignores the few points at a gap or an aisle. Nothing for fewer than two distinct places.
 */
export function measurePitch(points: readonly V3[]): number | undefined {
  const step = Math.max(1, Math.floor(points.length / SAMPLE));
  const nearest: number[] = [];
  for (let index = 0; index < points.length; index += step) {
    const from = points[index];
    if (!from) continue;
    const distances = points.map((point) => length(sub(point, from))).filter((d) => d > SAME_PLACE);
    if (distances.length > 0) nearest.push(distances.reduce((a, b) => Math.min(a, b)));
  }
  nearest.sort((a, b) => a - b);
  return nearest[Math.floor(nearest.length / 2)];
}

/** The 27 cells around and with a cell. */
const AROUND = [-1, 0, 1].flatMap((x) => [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((z): V3 => [x, y, z])));

/**
 * For each point, the offsets to the other points within `reach`, nearest first. A hash of cells of `reach` keeps the
 * search near linear, as a plot holds thousands of placements of one Symdef.
 */
export function neighbourOffsets(points: readonly V3[], reach: number): V3[][] {
  const cellOf = (p: V3, d: V3): string => [0, 1, 2].map((i) => Math.floor((p[i] ?? 0) / reach) + (d[i] ?? 0)).join();
  const cells = new Map<string, V3[]>();
  for (const point of points) {
    const key = cellOf(point, [0, 0, 0]);
    const cell = cells.get(key) ?? [];
    cell.push(point);
    cells.set(key, cell);
  }
  return points.map((point) => {
    const near = AROUND.flatMap((d) => cells.get(cellOf(point, d)) ?? []).map((other) => sub(other, point));
    const kept = near.filter((offset) => length(offset) > SAME_PLACE && length(offset) <= reach);
    return kept.sort((a, b) => length(a) - length(b));
  });
}
