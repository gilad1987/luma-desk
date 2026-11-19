import type { WallExtent } from './ledMeshExtents';

/**
 * Parts closer than this, in metres, on each wall axis, are tiles of one wall: cabinets stand edge to edge or with a
 * seam of a few centimetres, and their fronts are flush to within a few centimetres. Walls apart stand much further.
 */
const JOIN_GAP = 0.1;

const touch = (a: WallExtent, b: WallExtent): boolean =>
  b.low.x - a.high.x <= JOIN_GAP &&
  a.low.x - b.high.x <= JOIN_GAP &&
  b.low.y - a.high.y <= JOIN_GAP &&
  a.low.y - b.high.y <= JOIN_GAP &&
  Math.abs(a.high.z - b.high.z) <= JOIN_GAP;

/**
 * Joins the extents of the tiles of one wall into one extent round them all, and keeps walls apart apart. A video
 * wall of N cabinets is N parts (N instances of one cabinet, or N parts of one merged mesh); a light per part would
 * give the pool four small lights of four tiles, where the wall needs one light of its full area. Two extents are
 * one wall when their rectangles on the wall axes touch or overlap within `JOIN_GAP` and their fronts stand at about
 * one depth; a wall is every extent that a chain of such pairs reaches.
 */
export function joinExtents(extents: readonly WallExtent[]): WallExtent[] {
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
  const joined = new Map<number, WallExtent>();
  extents.forEach((extent, i) => {
    const root = find(i);
    const into = joined.get(root);
    if (into) {
      into.low.min(extent.low);
      into.high.max(extent.high);
    } else joined.set(root, { low: extent.low.clone(), high: extent.high.clone() });
  });
  return [...joined.values()];
}
