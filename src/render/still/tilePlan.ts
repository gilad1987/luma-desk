/** A tile is at most one 1080p frame, so its targets cost what the live view already costs. */
export const MAX_TILE_WIDTH = 1920;
export const MAX_TILE_HEIGHT = 1080;
/** The largest output side the plan accepts: the largest texture side WebGL implementations report. */
export const MAX_OUTPUT_SIDE = 16384;

/** One tile of the output image, in output pixels. */
export interface TileRect {
  /** Its place in the reassembly order: rows top to bottom, each row left to right. */
  readonly index: number;
  /** Left and top edge, from the image's top-left corner (as `setViewOffset` and PNG rows count). */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** The bottom edge counted from the image's bottom: the row a WebGL viewport or read-back starts at. */
  readonly glY: number;
}

export interface TilePlan {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly TileRect[];
}

/** The arguments of `PerspectiveCamera.setViewOffset` for one tile and one sample. */
export interface ViewOffset {
  readonly fullWidth: number;
  readonly fullHeight: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function checkSide(side: number, name: string): void {
  if (!Number.isInteger(side) || side < 1 || side > MAX_OUTPUT_SIDE) {
    throw new RangeError(`${name} must be a whole number from 1 to ${MAX_OUTPUT_SIDE}, not ${side}`);
  }
}

/** Cuts `[0, size)` into `count` parts whose sizes differ by at most 1 px; the edges are exact integers. */
function cuts(size: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, i) => Math.floor((i * size) / count));
}

/**
 * Splits a `width` x `height` image into the fewest tiles of at most `maxWidth` x `maxHeight`. Neighbouring tiles
 * share an edge and never a pixel, and together they cover every pixel once, so the reassembled image has no seam
 * from the plan itself. Even cuts (not full tiles plus a thin last one) keep every tile about the same cost.
 */
export function planTiles(
  width: number,
  height: number,
  maxWidth = MAX_TILE_WIDTH,
  maxHeight = MAX_TILE_HEIGHT,
): TilePlan {
  checkSide(width, 'width');
  checkSide(height, 'height');
  const xs = cuts(width, Math.ceil(width / maxWidth));
  const ys = cuts(height, Math.ceil(height / maxHeight));
  const tiles: TileRect[] = [];
  for (let row = 0; row + 1 < ys.length; row++) {
    for (let col = 0; col + 1 < xs.length; col++) {
      const [x, right, y, bottom] = [xs[col] ?? 0, xs[col + 1] ?? 0, ys[row] ?? 0, ys[row + 1] ?? 0];
      tiles.push({ index: tiles.length, x, y, width: right - x, height: bottom - y, glY: height - bottom });
    }
  }
  return { width, height, tiles };
}

/**
 * The view offset that renders `tile` with the sample's sub-pixel `jitter`. The jitter moves the window, not the
 * tile: the tile keeps its integer size, so every sample lands on the same output pixels.
 */
export function viewOffset(plan: TilePlan, tile: TileRect, jitter: readonly [number, number]): ViewOffset {
  return {
    fullWidth: plan.width,
    fullHeight: plan.height,
    x: tile.x + jitter[0],
    y: tile.y + jitter[1],
    width: tile.width,
    height: tile.height,
  };
}
