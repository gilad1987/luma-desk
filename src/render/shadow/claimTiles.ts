import { ROW } from '../beams/packBeam';
import { read } from './beamFrame';
import type { Picks } from './rankBeams';
import { sameKey, storeKey } from './tileKey';

/** The tiles of a schedule, one entry per tile, with the frame being planned and the tile of every beam instance. */
export interface TileState {
  /** The number of the frame being planned, its scenery epoch, and the bits of its beam rows (`rowWords`). */
  frame: number;
  epoch: number;
  words: Uint32Array;
  /** The row key each tile was last given (see `tileKey.ts`). */
  readonly keys: Uint32Array;
  /** The scenery epoch each tile was drawn at; 0 while its depth is not that of its key. */
  readonly epochs: Uint32Array;
  /** 1 while a tile holds the depth of the row one step before its key: it is read, and drawn again in its turn. */
  readonly late: Uint8Array;
  /** The frame each tile was last claimed in: a tile of this frame is taken, and the oldest is given away first. */
  readonly claimed: Uint32Array;
  /** The beam instance each tile was claimed for. */
  readonly lights: Int16Array;
  readonly tileOf: Int16Array;
  /** Per beam instance: a tile of the other class that holds the depth of its row this frame, or -1 (`lendTiles`). */
  readonly loans: Int16Array;
}

/** A run of the picks and the run of tiles they are given from; each is a first and an end. */
export interface Span {
  readonly lights: readonly [number, number];
  readonly tiles: readonly [number, number];
}

export function take(state: TileState, tile: number, light: number): void {
  state.claimed[tile] = state.frame;
  state.lights[tile] = light;
  state.tileOf[light] = tile;
}

/**
 * A light whose row is the key of a tile gets that tile again, with its depth. All lights do this before any light
 * with a new row gets a tile (`fillTiles`): so a moving light never takes the tile of a static light that is still
 * picked. Two lights with one row share a tile.
 */
export function keepTiles(state: TileState, picks: Picks, { lights: [from, to], tiles: [first, end] }: Span): void {
  const { keys, tileOf, words } = state;
  for (let k = from; k < to; k++) {
    const light = read(picks.lights, k);
    for (let tile = first; tile < end && read(tileOf, light) < 0; tile++) {
      if (sameKey(words, light * ROW, keys, tile)) take(state, tile, light);
    }
  }
}

/**
 * Gives each light that has no tile the tile that was unused for longest, so a light that leaves the picks for some
 * frames finds its tile again unless another light needed it. With `lent` false, a light that reads a lent tile
 * waits: it is shadowed, and the lights that are not go first.
 */
export function fillTiles(state: TileState, picks: Picks, span: Span, lent: boolean): void {
  const { claimed, frame, keys, loans, tileOf, words } = state;
  const [first, end] = span.tiles;
  for (let k = span.lights[0]; k < span.lights[1]; k++) {
    const light = read(picks.lights, k);
    if (read(tileOf, light) >= 0 || (!lent && read(loans, light) >= 0)) continue;
    let oldest = -1;
    for (let tile = first; tile < end; tile++) {
      if (claimed[tile] !== frame && (oldest < 0 || read(claimed, tile) < read(claimed, oldest))) oldest = tile;
    }
    if (oldest < 0) continue;
    storeKey(words, light * ROW, keys, oldest);
    state.epochs[oldest] = 0;
    take(state, oldest, light);
  }
}
