import { clusterPanels, panelLinks, type PanelLink } from './ledClusters';
import { commonLayer, dot, scale, unit, type PanelPose, type V3 } from './ledPose';
import { withGridSpacing } from './ledSpacing';
import { unrollChain } from './ledUnroll';

/** Where a panel is on its wall: the wall point of its centre in metres, and how its own edges run on the wall. */
export interface PanelWallCoord {
  readonly wall: number;
  readonly u: number;
  readonly v: number;
  /** Wall u per metre of local x and of local z, then wall v per metre of local x and of local z. */
  readonly axes: readonly [number, number, number, number];
  /** +1 when the panel's own normal is on the side of the wall's `normal`, -1 when it is turned the other way. */
  readonly side: 1 | -1;
}

/** One wall: a cluster of panels, as a light source would see it. Position is before the stage offset. */
export interface LedWall {
  /** Uuid of the layer most of the wall's panels are on; empty when the panels bring no layer. */
  readonly layer: string;
  readonly centre: V3;
  /** The mean of the panel normals on one side of the wall; the file does not say which side is the front. */
  readonly normal: V3;
  /** The unrolled size: for a curved wall the arc length, not the chord. */
  readonly width: number;
  readonly height: number;
}

/** The wall point of a place on a panel, `x` and `z` in metres from its centre: the mapping the shader draws. */
export function wallPoint(coord: PanelWallCoord, x: number, z: number): [number, number] {
  const [ux, uz, vx, vz] = coord.axes;
  return [coord.u + ux * x + uz * z, coord.v + vx * x + vz * z];
}

const sumOf = (points: readonly V3[]): V3 =>
  points.reduce<V3>((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]);

/**
 * Maps one wall: u runs along it, level; v runs up its face (for a wall that lies flat: along its depth). The walk
 * along the neighbour chain (`unrollChain`) gives every panel its side of the wall and its place on it.
 */
function mapWall(
  panels: readonly PanelPose[],
  links: readonly PanelLink[],
  wall: number,
): { coords: PanelWallCoord[]; wall: LedWall } {
  const rolled = unrollChain(panels, links);
  const coords = panels.flatMap((p, i): PanelWallCoord[] => {
    const at = rolled[i];
    if (!at) return [];
    const { level: l, rise: r } = at;
    const axes = [dot(p.x, l), dot(p.z, l), dot(p.x, r), dot(p.z, r)] as const;
    return [{ wall, u: at.u, v: at.v, axes, side: dot(p.normal, at.normal) < 0 ? -1 : 1 }];
  });
  const mean = sumOf(rolled.map((at) => at.normal));
  // The normals of a wall that closes into a ring sum to nothing: it keeps the side of its first panel.
  const closed = Math.hypot(mean[0], mean[1], mean[2]) < 1e-3 * rolled.length;
  const normal = closed ? (rolled[0]?.normal ?? [0, 0, 1]) : unit(mean);
  const pitch = panels[0]?.pitch ?? 0;
  const centre = scale(sumOf(panels.map((p) => p.position)), 1 / Math.max(1, panels.length));
  const size = (lengths: readonly number[]): number => lengths.reduce((most, l) => Math.max(most, l), 0) + pitch;
  const [width, height] = [size(rolled.map((at) => at.u)), size(rolled.map((at) => at.v))];
  return { coords, wall: { layer: commonLayer(panels), centre, normal, width, height } };
}

/** Groups `panels` into walls and gives each panel its place on its wall, so content runs across the whole wall. */
export function mapWalls(poses: readonly PanelPose[]): { coords: PanelWallCoord[]; walls: LedWall[] } {
  const panels = withGridSpacing(poses);
  const links = panelLinks(panels);
  const roots = clusterPanels(panels, links);
  const walls: LedWall[] = [];
  const coords: PanelWallCoord[] = [];
  for (const rootIndex of new Set(roots)) {
    const members = roots.flatMap((value, index) => (value === rootIndex ? [index] : []));
    const local = new Map(members.map((index, at) => [index, at]));
    const own = links.flatMap(([a, b]): PanelLink[] => {
      const [la, lb] = [local.get(a), local.get(b)];
      return la === undefined || lb === undefined ? [] : [[la, lb]];
    });
    const wallPanels = members.flatMap((index) => panels[index] ?? []);
    const mapped = mapWall(wallPanels, own, walls.length);
    members.forEach((index, at) => {
      const coord = mapped.coords[at];
      if (coord) coords[index] = coord;
    });
    walls.push(mapped.wall);
  }
  return { coords, walls };
}
