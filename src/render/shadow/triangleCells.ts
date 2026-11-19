/** Cells either side of the origin that get their own key; with 4 m cells this is 8 km. */
const HALF = 2048;
/**
 * The most cells one long triangle is put in. A floor of two triangles covers hundreds of cells and would be in the
 * index once for each, so past this number a triangle goes to the one run of large triangles.
 */
export const MAX_CELLS = 16;
const LARGE = -1;
/** The part of a cell by which it reaches into its neighbours: a floor at y = 0 with rounding noise is in one cell. */
const SLACK = 1e-4;
const AXES = [0, 1, 2] as const;

/** A box that holds nothing yet: min x, y, z, max x, y, z. */
export const EMPTY = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity] as const;

export const at = (values: readonly number[], i: number): number => values[i] ?? 0;

export function grow(box: number[], x: number, y: number, z: number): void {
  [x, y, z].forEach((value, i) => {
    box[i] = Math.min(box[i] ?? value, value);
    box[i + 3] = Math.max(box[i + 3] ?? value, value);
  });
}

const keyOf = (id: readonly number[]): number =>
  at(id, 0) + HALF + 2 * HALF * (at(id, 1) + HALF + 2 * HALF * (at(id, 2) + HALF));

/** Called with the key of a cell, a triangle in it and the part of the triangle's box that the cell holds. */
export type Put = (key: number, triangle: number, box: readonly number[]) => void;

/**
 * Calls `put` for every cell a triangle belongs to (`boxOf` gives the box of a triangle; the box passed to `put` is
 * reused between calls). A triangle no longer than a cell is in the cell of its centre, whole. A longer one is in
 * every cell its box overlaps, cut to the cell: a 12 m truss chord would else make the box of one cell 12 m long,
 * and that box is what a light's frustum is tested against.
 */
export function eachCell(boxOf: (triangle: number) => number[], triangles: number, cell: number, put: Put): void {
  const slack = cell * SLACK;
  const part: number[] = [];
  for (let t = 0; t < triangles; t++) {
    const own = boxOf(t);
    if (AXES.every((i) => at(own, i + 3) - at(own, i) <= cell)) {
      put(keyOf(AXES.map((i) => Math.floor(((at(own, i) + at(own, i + 3)) / 2 + slack) / cell))), t, own);
      continue;
    }
    const low = AXES.map((i) => Math.floor((at(own, i) + slack) / cell));
    const n = AXES.map((i) => Math.max(0, Math.floor((at(own, i + 3) - slack) / cell) - at(low, i)) + 1);
    const cells = at(n, 0) * at(n, 1) * at(n, 2);
    if (cells > MAX_CELLS) put(LARGE, t, own);
    for (let k = 0; k < cells && cells <= MAX_CELLS; k++) {
      const steps = [k % at(n, 0), Math.floor(k / at(n, 0)) % at(n, 1), Math.floor(k / (at(n, 0) * at(n, 1)))];
      const id = steps.map((step, i) => at(low, i) + step);
      id.forEach((cellId, i) => {
        part[i] = Math.max(at(own, i), cellId * cell - slack);
        part[i + 3] = Math.min(at(own, i + 3), (cellId + 1) * cell + slack);
      });
      put(keyOf(id), t, part);
    }
  }
}
