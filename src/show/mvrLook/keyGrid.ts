import { mirrorOrder, sideOf, type LookArea, type LookPoint, type Placed } from './lookArea';

/** Share of the deck width the band area takes: the band stands inside the deck edge, not on it. */
const BAND_WIDTH = 0.8;
/** The band area in depth, as shares of the half depth: from a little upstage of the middle to near the lip. */
const BAND_BACK = 0.2;
const BAND_FRONT = 0.8;
/** Metres above the floor a key light aims at: the face of a standing performer. */
export const FACE_HEIGHT_M = 1.6;
/** Share of its diameter a key pool shares with its neighbour, so the cover has no dark seam. */
const OVERLAP = 0.3;
/** The distance between two neighbouring key pools, as a share of the pool diameter. */
export const POOL_PITCH = 1 - OVERLAP;
/** The smallest key pool in metres: what a performer moves in. */
const MIN_POOL_M = 3;
/** Three rows of pools cover the deepest band; more rows only thin the light. */
const MAX_ROWS = 3;

/** The area the band plays in: width and depth in metres, square metres, and its middle at face height. */
export interface KeyBand {
  readonly width: number;
  readonly depth: number;
  readonly area: number;
  readonly centre: LookPoint;
}

/** The band area of a stage: the deck less its edges, weighted to the downstage half. */
export function keyBandOf(area: LookArea): KeyBand {
  const width = 2 * area.halfWidth * BAND_WIDTH;
  const depth = area.halfDepth * (BAND_BACK + BAND_FRONT);
  const z = area.cz + (area.halfDepth * (BAND_FRONT - BAND_BACK)) / 2;
  return { width, depth, area: width * depth, centre: [area.cx, area.floor + FACE_HEIGHT_M, z] };
}

/** The key points of a rig: the pool diameter in metres, the rows of points in depth, and each unit's point. */
export interface KeyGrid {
  readonly pool: number;
  readonly rows: number;
  readonly point: (f: Placed) => LookPoint;
}

/**
 * The grid of key points on the band area. The pool is sized so that the units cover the band with about 30 %
 * overlap (one cell of the band per unit), never wider than `widestPool`, the pool the units can make at their throw
 * (2 x throw x tan(widest zoom / 2)), and never smaller than a performer needs. Across the stage the units take equally spaced columns in their own
 * order from left to right, the outer pools ending at the band edge: the left unit lights the left, no two key beams
 * of one side cross, and a truss with a gap in its middle still covers the middle of the band. One position (one
 * unit, one column of units) aims at the centre line. In depth the band takes as many rows as the pool
 * needs and the units can fill; neighbouring units take different rows, mirrored about the centre line.
 */
export function keyGridOf(area: LookArea, key: readonly Placed[], widestPool: number): KeyGrid {
  const band = keyBandOf(area);
  const cell = Math.sqrt(band.area / Math.max(key.length, 1));
  const pool = Math.min(Math.max(cell / (1 - OVERLAP), MIN_POOL_M), Math.max(widestPool, MIN_POOL_M));
  const pitch = pool * POOL_PITCH;
  const perRow = Math.max(1, Math.ceil(band.width / pitch));
  const rows = Math.max(1, Math.min(MAX_ROWS, Math.round(band.depth / pitch), Math.floor(key.length / perRow)));
  const place = sideOf(area, key);
  const ranked = mirrorOrder(key, area.cx).map((f) => f.id);
  const isOnePosition = key.every((f) => place(f) === 0);
  /** -1 at the first unit from the left, 1 at the last, in equal steps; a unit outside the plan keeps its place. */
  const side = (f: Placed): number => {
    const rank = ranked.indexOf(f.id);
    return rank < 0 || isOnePosition ? place(f) : (2 * rank - (ranked.length - 1)) / (ranked.length - 1);
  };
  const rowOf = (f: Placed): number => {
    const rank = Math.max(ranked.indexOf(f.id), 0);
    return Math.min(rank, ranked.length - 1 - rank) % rows;
  };
  return {
    pool,
    rows,
    point: (f) => {
      const x = area.cx + (side(f) * Math.max(band.width - pool, 0)) / 2;
      const z = band.centre[2] + ((rowOf(f) + 0.5) / rows - 0.5) * band.depth;
      return [x, band.centre[1], z];
    },
  };
}
