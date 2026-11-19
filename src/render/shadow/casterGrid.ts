import { at, eachCell, EMPTY, grow } from './triangleCells';

/** The positions of a mesh, as a three.js attribute gives them. */
export interface Points {
  getX(vertex: number): number;
  getY(vertex: number): number;
  getZ(vertex: number): number;
}

/** The triangles of one grid cell: a run of the sorted index, and the box around them (min x, y, z, max x, y, z). */
export interface CellRun {
  readonly start: number;
  readonly count: number;
  readonly box: readonly number[];
}

export interface CellRuns {
  /** The mesh's triangles ordered by cell, three vertex numbers each; a long triangle is in it once per cell. */
  readonly index: Uint32Array;
  readonly runs: readonly CellRun[];
}

function triangleBox(points: Points, vertexOf: (corner: number) => number, t: number): number[] {
  const own = [...EMPTY];
  for (let c = 0; c < 3; c++) {
    const v = vertexOf(t * 3 + c);
    grow(own, points.getX(v), points.getY(v), points.getZ(v));
  }
  return own;
}

/**
 * Sorts the triangles of a mesh by grid cell (see `eachCell`). The result is only a new index: the vertices stay
 * where they are, so a chunk per cell can share the mesh's vertex buffer and draw its own run. A triangle that is in
 * two runs is drawn twice by a light that sees both cells, which a depth pass does not show.
 * `vertexOf` gives the vertex of a corner (corner 3t + c of triangle t).
 */
export function binTriangles(
  points: Points,
  vertexOf: (corner: number) => number,
  triangles: number,
  cell: number,
): CellRuns {
  const boxOf = (t: number): number[] => triangleBox(points, vertexOf, t);
  const slots = new Map<number, number>();
  const counts: number[] = [];
  const boxes: number[][] = [];
  /** A slot and a triangle for every place of a triangle in a run. */
  const placed: number[] = [];
  eachCell(boxOf, triangles, cell, (key, t, part) => {
    const slot = slots.get(key) ?? slots.size;
    if (slot === slots.size) boxes.push([...EMPTY]);
    slots.set(key, slot);
    counts[slot] = at(counts, slot) + 1;
    grow(boxes[slot] ?? [], at(part, 0), at(part, 1), at(part, 2));
    grow(boxes[slot] ?? [], at(part, 3), at(part, 4), at(part, 5));
    placed.push(slot, t);
  });
  const ends: number[] = [];
  counts.reduce((sum, count, slot) => ((ends[slot] = sum), sum + count), 0);
  const index = new Uint32Array((placed.length / 2) * 3);
  for (let p = 0; p < placed.length; p += 2) {
    const slot = at(placed, p);
    const to = at(ends, slot) * 3;
    ends[slot] = at(ends, slot) + 1;
    for (let c = 0; c < 3; c++) index[to + c] = vertexOf(at(placed, p + 1) * 3 + c);
  }
  // each entry of `ends` started at the first triangle of its run and is now past the last
  const runs = counts.map((count, slot) => ({
    start: (at(ends, slot) - count) * 3,
    count: count * 3,
    box: boxes[slot] ?? [],
  }));
  return { index, runs };
}
