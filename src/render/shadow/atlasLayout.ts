/** A run of square tiles of one size. */
export interface TileBand {
  readonly count: number;
  /** Texels per side. */
  readonly size: number;
}

/**
 * The shadow atlas as two bands of square tiles in one square texture. The hero tiles come first, from the first
 * texel row; the secondary tiles follow in the rows after them. A tile index below `hero.count` is a hero tile.
 */
export interface AtlasLayout {
  /** Texels per side of the atlas. */
  readonly size: number;
  readonly hero: TileBand;
  readonly secondary: TileBand;
}

/** The layout while the desk runs: one half holds 8 large tiles, the other half 32 small ones. */
export const LIVE_LAYOUT: AtlasLayout = {
  size: 4096,
  hero: { count: 8, size: 1024 },
  secondary: { count: 32, size: 512 },
};

/** The layout for a still picture: every one of the 64 lights gets a large tile, as nothing redraws per frame. */
export const STILL_LAYOUT: AtlasLayout = {
  size: 8192,
  hero: { count: 64, size: 1024 },
  secondary: { count: 0, size: 512 },
};

export const tileCount = (layout: AtlasLayout): number => layout.hero.count + layout.secondary.count;

/** Numbers per tile in `tileRects`: x and y of the first texel, then the side. */
export const RECT = 3;

/**
 * The texel rectangle of every tile. It throws when the tiles do not fit, so a wrong layout fails when the atlas is
 * made and not as shadows of one light inside the tile of another.
 */
export function tileRects(layout: AtlasLayout): Uint16Array {
  const rects = new Uint16Array(tileCount(layout) * RECT);
  let tile = 0;
  let top = 0;
  for (const band of [layout.hero, layout.secondary]) {
    if (band.count === 0) continue;
    const perRow = Math.floor(layout.size / band.size);
    if (perRow === 0) throw new RangeError(`a tile of ${band.size} texels does not fit an atlas of ${layout.size}`);
    for (let i = 0; i < band.count; i++, tile++) {
      rects[tile * RECT] = (i % perRow) * band.size;
      rects[tile * RECT + 1] = top + Math.floor(i / perRow) * band.size;
      rects[tile * RECT + 2] = band.size;
    }
    top += Math.ceil(band.count / perRow) * band.size;
  }
  if (top > layout.size) throw new RangeError(`the tiles need ${top} texel rows; the atlas has ${layout.size}`);
  return rects;
}
