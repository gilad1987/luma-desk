import type { Vector3 } from 'three';
import { wallGroups } from './ledExtentJoin';
import { axesOf, extentOf } from './ledMeshExtents';

/** Two parts whose own fronts have at least this cosine face one way, as the instances of one wall do. */
const ONE_WAY = 0.99;

/** A connected part of a merged mesh: its triangle corners in the world, its own front, its area seen from it. */
export interface JudgedPart {
  readonly corners: Float32Array;
  readonly own: Vector3;
  readonly area: number;
}

/** A wall of a merged mesh: the front its parts share, and the sum of their areas seen from it. */
export interface PartWall {
  readonly front: Vector3;
  readonly area: number;
}

/**
 * The walls of the `parts` of a merged mesh. A video wall merged from N cabinets is N small parts; the parts that
 * face one way and whose rectangles on the wall axes touch (`wallGroups`, as their light joins) are one wall, and its
 * area is the sum of theirs. A part with no wall face (`extentOf` gives none) is a wall alone.
 */
export function partWalls(parts: readonly JudgedPart[]): PartWall[] {
  const ways: JudgedPart[][] = [];
  for (const part of parts) {
    const way = ways.find(([first]) => first !== undefined && first.own.dot(part.own) >= ONE_WAY);
    if (way) way.push(part);
    else ways.push([part]);
  }
  return ways.flatMap((way) => {
    const front = way[0]?.own;
    if (!front) return [];
    const axes = axesOf(front);
    const alone: PartWall[] = [];
    const placed = way.flatMap((part) => {
      const extent = extentOf(part.corners, undefined, axes);
      if (!extent) alone.push({ front: part.own, area: part.area });
      return extent ? [{ part, extent }] : [];
    });
    const walls = wallGroups(placed.map(({ extent }) => extent)).map((tiles) => ({
      front,
      area: tiles.reduce((sum, i) => sum + (placed[i]?.part.area ?? 0), 0),
    }));
    return [...walls, ...alone];
  });
}
