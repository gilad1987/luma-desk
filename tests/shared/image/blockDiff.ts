import type { LabPlanes } from './oklab';

/** Side of the square pixel block the metric averages over: small enough to see a missing truss line. */
export const BLOCK = 4;
// The offsets, in pixels, at which a block may find its match in the other image (see blockDistances).
const SHIFTS = [-1, 0, 1];

/** Summed-area table: entry (x, y) holds the sum over [0, x) × [0, y), so any box sum costs four reads. */
function integral(plane: Float32Array, w: number, h: number): Float64Array {
  const s = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += plane[y * w + x] ?? 0;
      s[(y + 1) * (w + 1) + x + 1] = (s[y * (w + 1) + x + 1] ?? 0) + row;
    }
  }
  return s;
}

type Tables = readonly Float64Array[];
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Mean of each Oklab channel over the box [x0, x1) × [y0, y1); `stride` is the table width. */
function boxMean(tables: Tables, stride: number, { x0, y0, x1, y1 }: Box): number[] {
  const n = (x1 - x0) * (y1 - y0);
  const at = (s: Float64Array, x: number, y: number): number => s[y * stride + x] ?? 0;
  return tables.map((s) => (at(s, x1, y1) - at(s, x1, y0) - at(s, x0, y1) + at(s, x0, y0)) / n);
}

interface Pair {
  own: Tables;
  other: Tables;
  w: number;
  h: number;
}

/** Oklab distance from block `box` of `own` to the closest window of `other` moved by up to 1 px on each axis. */
function closest({ own, other, w, h }: Pair, box: Box): number {
  const mine = boxMean(own, w + 1, box);
  let best = Infinity;
  for (const dy of SHIFTS) {
    for (const dx of SHIFTS) {
      const moved = { x0: Math.max(0, box.x0 + dx), y0: Math.max(0, box.y0 + dy) };
      const window = { ...moved, x1: Math.min(w, box.x1 + dx), y1: Math.min(h, box.y1 + dy) };
      if (window.x1 <= window.x0 || window.y1 <= window.y0) continue;
      const theirs = boxMean(other, w + 1, window);
      best = Math.min(best, Math.hypot(...mine.map((v, i) => v - (theirs[i] ?? 0))));
    }
  }
  return best;
}

export interface BlockGrid {
  cols: number;
  rows: number;
  /** Shift-tolerant Oklab distance of each block, row by row. */
  dist: Float64Array;
}

/**
 * Block distances in Oklab, tolerant to a 1 px move. Each 4x4 block mean of one image is compared with the 4x4
 * window means of the other image at offsets of -1, 0 and +1 px on each axis, and the closest match counts. A
 * rasterizer that moves a thin line or an edge by one whole pixel then gives about 0, while a lost or dimmed object
 * has no close window and keeps its full difference. The check runs both ways and takes the larger, because a line
 * added on a block edge would otherwise find a window without it.
 */
export function blockDistances(a: LabPlanes, b: LabPlanes): BlockGrid {
  const [w, h] = [a.width, a.height];
  const ta = [a.l, a.a, a.b].map((p) => integral(p, w, h));
  const tb = [b.l, b.a, b.b].map((p) => integral(p, w, h));
  const [cols, rows] = [Math.ceil(w / BLOCK), Math.ceil(h / BLOCK)];
  const dist = new Float64Array(cols * rows);
  for (let k = 0; k < dist.length; k++) {
    const [x0, y0] = [(k % cols) * BLOCK, Math.floor(k / cols) * BLOCK];
    const box = { x0, y0, x1: Math.min(w, x0 + BLOCK), y1: Math.min(h, y0 + BLOCK) };
    dist[k] = Math.max(closest({ own: ta, other: tb, w, h }, box), closest({ own: tb, other: ta, w, h }, box));
  }
  return { cols, rows, dist };
}
