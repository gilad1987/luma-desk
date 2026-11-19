import type { PanelLink } from './ledClusters';
import { dot, scale, unit, type PanelPose, type V3 } from './ledPose';

export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** `a` turned to the side of `to`. */
export const toward = (a: V3, to: V3): V3 => scale(a, dot(a, to) < 0 ? -1 : 1);

/** What the walk along a wall gives one panel. */
export interface Unrolled {
  /** The panel's normal on the one side of the wall that the walk keeps to; the file turns panels either way. */
  readonly normal: V3;
  /** Unit direction of wall u at the panel (level, along the wall) and of wall v (up its face). */
  readonly level: V3;
  readonly rise: V3;
  /** Length along the wall and up it to the panel's centre, metres from the walk's start. */
  readonly u: number;
  readonly v: number;
}

/** The panel at the start of a walk: its own normal, u level along its face (a panel that lies flat: along X). */
function first(panel: PanelPose): Unrolled {
  const normal = panel.normal;
  const level: V3 = Math.abs(normal[1]) > 0.99 ? [1, 0, 0] : unit([normal[2], 0, -normal[0]]);
  return { normal, level, rise: unit(cross(normal, level)), u: 0, v: 0 };
}

/**
 * The length of the move `d` from one panel centre to the next along a wall direction that is `a` on the first panel
 * and `b` on the second. Two flat tiles that meet at an edge are half a tile along `a` plus half a tile along `b`
 * apart, and this gives that whole tile, whatever the bend between them; in one plane it is the plain projection.
 */
const step = (d: V3, a: V3, b: V3): number => (dot(d, a) + dot(d, b)) / Math.max(0.2, 1 + dot(a, b));

/** The next panel of the walk, reached from `from` at `before`. */
function next(panel: PanelPose, from: PanelPose, before: Unrolled): Unrolled {
  const normal = toward(panel.normal, before.normal);
  // A panel that lies flat has no level direction of its own: it keeps the one of the panel it was reached from.
  const own: V3 = Math.abs(normal[1]) > 0.99 ? before.level : unit([normal[2], 0, -normal[0]]);
  const level = toward(own, before.level);
  const rise = unit(cross(normal, level));
  const [p, f] = [panel.position, from.position];
  const d: V3 = [p[0] - f[0], p[1] - f[1], p[2] - f[2]];
  return { normal, level, rise, u: before.u + step(d, before.level, level), v: before.v + step(d, before.rise, rise) };
}

/**
 * Unrolls one wall: the panels are walked along their neighbour chain (`links`, breadth first from the first panel),
 * and each step turns the next panel's normal to the side of the last one and adds the move along the wall. So the
 * normals are one side of the wall however far it bends, and u is the arc length: a wall that curves by any angle up
 * to a full circle unrolls, in plan or in section (a wall that runs out into a ramp), and the image neither stretches
 * nor breaks at a panel edge. Panels in one column add nothing to u, and a second layer just behind the first adds
 * nothing. u and v start at 0 at the lowest value. A panel no chain reaches starts a walk of its own.
 */
export function unrollChain(panels: readonly PanelPose[], links: readonly PanelLink[]): Unrolled[] {
  const beside = panels.map((): number[] => []);
  for (const [a, b] of links) {
    beside[a]?.push(b);
    beside[b]?.push(a);
  }
  const rolled: (Unrolled | undefined)[] = panels.map(() => undefined);
  panels.forEach((panel, start) => {
    if (rolled[start]) return;
    rolled[start] = first(panel);
    const queue = [start];
    for (let at = queue.shift(); at !== undefined; at = queue.shift()) {
      const [from, before] = [panels[at], rolled[at]];
      for (const other of beside[at] ?? []) {
        const to = panels[other];
        if (!from || !before || !to || rolled[other]) continue;
        rolled[other] = next(to, from, before);
        queue.push(other);
      }
    }
  });
  const done = rolled.flatMap((one) => one ?? []);
  // a loop, as a spread of a very large wall into Math.min overflows the call stack
  let [u0, v0] = [Infinity, Infinity];
  for (const one of done) [u0, v0] = [Math.min(u0, one.u), Math.min(v0, one.v)];
  return done.map((one) => ({ ...one, u: one.u - u0, v: one.v - v0 }));
}
