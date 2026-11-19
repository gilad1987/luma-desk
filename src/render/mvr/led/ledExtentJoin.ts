import { Vector3 } from 'three';
import type { WallExtent } from './ledMeshExtents';

/**
 * Parts closer than this, in metres, on each wall axis, are tiles of one wall: cabinets stand edge to edge or with a
 * seam of a few centimetres, and their fronts are flush to within a few centimetres. Walls apart stand much further.
 */
const JOIN_GAP = 0.1;

/** How far the spans [aLow, aHigh] and [bLow, bHigh] overlap: below 0 by the gap between them. */
const overlap = (aLow: number, aHigh: number, bLow: number, bHigh: number): number =>
  Math.min(aHigh, bHigh) - Math.max(aLow, bLow);

const touch = (a: WallExtent, b: WallExtent): boolean => {
  const x = overlap(a.low.x, a.high.x, b.low.x, b.high.x);
  const y = overlap(a.low.y, a.high.y, b.low.y, b.high.y);
  const isSide = (x > 0 && y >= -JOIN_GAP) || (y > 0 && x >= -JOIN_GAP);
  return isSide && Math.abs(a.high.z - b.high.z) <= JOIN_GAP;
};

/**
 * The walls among `extents`, each as the numbers of the extents of its tiles. Two extents are one wall when their
 * rectangles on the wall axes overlap on one axis and touch or overlap within `JOIN_GAP` on the other (they share a
 * side, not only a corner), and their fronts stand at about one depth; a wall is every extent that a chain of such
 * pairs reaches, so a grid of tiles joins through the neighbours on its sides.
 */
export function wallGroups(extents: readonly WallExtent[]): number[][] {
  const group = extents.map((_, i) => i);
  const find = (i: number): number => {
    let at = i;
    while ((group[at] ?? at) !== at) at = group[at] ?? at;
    group[i] = at;
    return at;
  };
  // In order of left edge: once one starts more than `JOIN_GAP` right of an extent, so do all after it.
  const order = extents.map((_, i) => i).sort((a, b) => (extents[a]?.low.x ?? 0) - (extents[b]?.low.x ?? 0));
  order.forEach((a, n) => {
    const first = extents[a];
    for (const b of order.slice(n + 1)) {
      const other = extents[b];
      if (!first || !other || other.low.x - first.high.x > JOIN_GAP) break;
      if (touch(first, other)) group[find(b)] = find(a);
    }
  });
  const walls = new Map<number, number[]>();
  extents.forEach((_, i) => {
    const root = find(i);
    const tiles = walls.get(root) ?? [];
    tiles.push(i);
    walls.set(root, tiles);
  });
  return [...walls.values()];
}

/**
 * Joins the extents of the tiles of one wall into one extent round them all, and keeps walls apart apart. A video
 * wall of N cabinets is N parts (N instances of one cabinet, or N parts of one merged mesh); a light per part would
 * give the pool four small lights of four tiles, where the wall needs one light of its full area. The walls are the
 * ones of `wallGroups`.
 */
export function joinExtents(extents: readonly WallExtent[]): WallExtent[] {
  return wallGroups(extents).map((tiles) => {
    const [low, high] = [new Vector3(Infinity, Infinity, Infinity), new Vector3(-Infinity, -Infinity, -Infinity)];
    for (const i of tiles) {
      const extent = extents[i];
      if (!extent) continue;
      low.min(extent.low);
      high.max(extent.high);
    }
    return { low, high };
  });
}
