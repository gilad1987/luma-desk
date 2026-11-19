import type { V3 } from './ledPose';

const cell = (value: number, size: number): number => Math.floor(value / size);

/** The 27 grid cells at and around a cell. */
const STEPS = [-1, 0, 1] as const;
const AROUND = STEPS.flatMap((dx) => STEPS.flatMap((dy) => STEPS.map((dz) => [dx, dy, dz] as const)));

/**
 * Calls `visit(earlier, later)` for every two points at most `reach` apart, through a grid of `reach` cells, so a
 * wall of thousands of panels is not compared pair by pair.
 */
export function nearPairs(points: readonly V3[], reach: number, visit: (earlier: number, later: number) => void): void {
  const grid = new Map<string, number[]>();
  points.forEach((point, index) => {
    const [cx, cy, cz] = [cell(point[0], reach), cell(point[1], reach), cell(point[2], reach)];
    for (const [dx, dy, dz] of AROUND) {
      for (const other of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
        const q = points[other];
        if (q && Math.hypot(q[0] - point[0], q[1] - point[1], q[2] - point[2]) <= reach) visit(other, index);
      }
    }
    const key = `${cx},${cy},${cz}`;
    grid.set(key, [...(grid.get(key) ?? []), index]);
  });
}
