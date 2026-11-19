import { ROW } from '../beams/packBeam';
import { read } from './beamFrame';
import { fillTiles, keepTiles, type Span, type TileState } from './claimTiles';
import type { Picks } from './rankBeams';
import { stepTiles } from './stepTiles';
import { sameKey } from './tileKey';

/**
 * Lends tiles across the classes. A light whose own tile holds no depth yet (`span.lights`) reads a tile of the other
 * class (`span.tiles`) that still holds the depth of its row. That is the light whose rank changed: a hero that falls
 * to the secondary lights would else be unshadowed until the round robin draws its new tile, with its depth still in
 * the atlas. The lent tile counts as claimed, so no light of its class is given it this frame.
 */
function lendTiles(state: TileState, picks: Picks, { lights: [from, to], tiles: [first, end] }: Span): void {
  const { claimed, epoch, epochs, frame, keys, loans, tileOf, words } = state;
  for (let k = from; k < to; k++) {
    const light = read(picks.lights, k);
    const own = read(tileOf, light);
    if (own >= 0 && epochs[own] === epoch) continue;
    for (let tile = first; tile < end && read(loans, light) < 0; tile++) {
      if (epochs[tile] !== epoch || !sameKey(words, light * ROW, keys, tile)) continue;
      claimed[tile] = frame;
      loans[light] = tile;
    }
  }
}

/**
 * Gives every pick its tile for the frame of `state`: the first `picks.heroes` from the hero tiles (the first
 * `heroTiles` tiles), the others from the secondary tiles. The order is what keeps a light shadowed through a change
 * of rank. A hero with neither a tile nor a loan is served first and may take any free hero tile. Then the secondary
 * lights borrow, and only then a hero that reads a lent tile takes a hero tile, if one is still free: so it never
 * takes the tile that a fallen hero still reads. When the fallen hero's own tile is drawn, that tile is free.
 */
export function claimAll(state: TileState, picks: Picks, heroTiles: number): void {
  const hero: Span = { lights: [0, picks.heroes], tiles: [0, heroTiles] };
  const rest: Span = { lights: [picks.heroes, picks.count], tiles: [heroTiles, state.claimed.length] };
  state.loans.fill(-1);
  keepTiles(state, picks, hero);
  keepTiles(state, picks, rest);
  stepTiles(state, picks, rest);
  lendTiles(state, picks, { lights: hero.lights, tiles: rest.tiles });
  fillTiles(state, picks, hero, false);
  lendTiles(state, picks, { lights: rest.lights, tiles: hero.tiles });
  fillTiles(state, picks, hero, true);
  fillTiles(state, picks, rest, true);
}

/**
 * After the draws of the frame are planned: a light reads its own tile when that holds this frame's depth, else
 * the tile it was lent, else nothing (-1): it is shown unshadowed, never with an old shadow.
 */
export function settleTiles(state: TileState, picks: Picks): void {
  const { epoch, epochs, loans, tileOf } = state;
  for (let k = 0; k < picks.count; k++) {
    const light = read(picks.lights, k);
    const own = read(tileOf, light);
    if (own < 0 || epochs[own] !== epoch) tileOf[light] = loans[light] ?? -1;
  }
}
