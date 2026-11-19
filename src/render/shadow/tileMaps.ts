import { RECT, tileCount, tileRects, type AtlasLayout } from './atlasLayout';
import { read } from './beamFrame';
import { CONE_MARGIN } from './tileFrustum';

/**
 * What a sampler needs per tile, as the two uniform arrays of `glsl/shadowTile.glsl`.
 * `tiles`, 4 floats per tile: the tile centre in atlas UV, then the atlas UV per unit of `q` on x and on y. So
 * `uv = centre + q * scale`: `q` maps linearly, with no divide. The x scale is negative (see `aimTileCamera`).
 * `depth`, 2 floats per tile: 1 / range and the bias, both in depth units. The atlas holds z / range, so the
 * reference depth of a sample is `z * depth[0] - depth[1]`.
 */
export interface TileMaps {
  readonly tiles: Float32Array;
  readonly depth: Float32Array;
}

/** The maps of a layout. `tiles` never changes after this; `depth` is written when a tile is drawn. */
export function createTileMaps(layout: AtlasLayout): TileMaps {
  const rects = tileRects(layout);
  const count = tileCount(layout);
  const tiles = new Float32Array(count * 4);
  for (let tile = 0; tile < count; tile++) {
    const half = read(rects, tile * RECT + 2) / 2;
    const reach = half / layout.size / (1 + CONE_MARGIN);
    tiles[tile * 4] = (read(rects, tile * RECT) + half) / layout.size;
    tiles[tile * 4 + 1] = (read(rects, tile * RECT + 1) + half) / layout.size;
    tiles[tile * 4 + 2] = -reach;
    tiles[tile * 4 + 3] = reach;
  }
  return { tiles, depth: new Float32Array(count * 2) };
}

/** Sets the depth scale of a tile drawn for a beam of `range` metres, with a bias of `bias` metres. */
export function setTileDepth(maps: TileMaps, tile: number, range: number, bias: number): void {
  maps.depth[tile * 2] = 1 / range;
  maps.depth[tile * 2 + 1] = bias / range;
}

/** A sample of a beam march: `q` across the beam in cone radii (x, y), then `z` in metres from the apex. */
export type BeamSample = readonly [qx: number, qy: number, z: number];

/** Writes the atlas u, v and the reference depth of a sample into `out`. */
export function beamShadowCoord(maps: TileMaps, tile: number, [qx, qy, z]: BeamSample, out: Float64Array): void {
  out[0] = read(maps.tiles, tile * 4) + qx * read(maps.tiles, tile * 4 + 2);
  out[1] = read(maps.tiles, tile * 4 + 1) + qy * read(maps.tiles, tile * 4 + 3);
  out[2] = z * read(maps.depth, tile * 2) - read(maps.depth, tile * 2 + 1);
}

const COORD = new Float64Array(3);

/**
 * The reference of `beamShadow` in `glsl/shadowTile.glsl`, with one texel in place of the 2x2 filter: 1 when the
 * sample is lit, 0 when a caster is nearer. `depthAt` gives the atlas depth at a UV. A beam without a tile is lit.
 */
export function beamShadow(
  maps: TileMaps,
  depthAt: (u: number, v: number) => number,
  sample: BeamSample,
  tile: number,
): number {
  if (tile < 0) return 1;
  beamShadowCoord(maps, tile, sample, COORD);
  return read(COORD, 2) <= depthAt(read(COORD, 0), read(COORD, 1)) ? 1 : 0;
}
