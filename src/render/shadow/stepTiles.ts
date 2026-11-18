import { ROW } from '../beams/packBeam';
import { read } from './beamFrame';
import { take, type Span, type TileState } from './claimTiles';
import type { Picks } from './rankBeams';
import { nearKey, storeKey } from './tileKey';

/**
 * A light that took one small step keeps its tile. Its new row is the key of no tile, so it would get another tile
 * and be unshadowed until that is drawn; for a light that steps once in 40 frames that is a blink at every step.
 * Here it takes the free tile whose key is one step from its row (`nearKey`: the same light a moment ago), with the
 * depth in it. The tile is marked late: it is read as it is and drawn again in its turn. Only a tile that holds
 * depth of this scenery epoch is kept, so a change of the scenery still shows no old shadow.
 */
export function stepTiles(state: TileState, picks: Picks, { lights: [from, to], tiles: [first, end] }: Span): void {
  const { claimed, epoch, epochs, frame, keys, late, tileOf, words } = state;
  for (let k = from; k < to; k++) {
    const light = read(picks.lights, k);
    for (let tile = first; tile < end && read(tileOf, light) < 0; tile++) {
      if (claimed[tile] === frame || epochs[tile] !== epoch || !nearKey(words, light * ROW, keys, tile)) continue;
      storeKey(words, light * ROW, keys, tile);
      late[tile] = 1;
      take(state, tile, light);
    }
  }
}
