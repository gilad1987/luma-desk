import { tileCount, type AtlasLayout } from './atlasLayout';
import { read } from './beamFrame';
import type { TileState } from './claimTiles';
import { claimAll, settleTiles } from './lendTiles';
import type { Picks } from './rankBeams';
import type { ShadowConfig } from './shadowConfig';
import { KEY } from './tileKey';

export type ScheduleCaps = Pick<ShadowConfig, 'maxDraws' | 'maxSecondary'>;

/**
 * Which tile each picked light has and which tiles are drawn this frame. A tile keeps its depth while the row of its
 * light (see `tileKey.ts`) and the scenery epoch stay the same, so a static rig draws nothing once every tile is
 * drawn. A hero tile that is out of date is drawn at once. Secondary tiles are drawn `maxSecondary` per frame, in
 * turn; a light whose tile is out of date reads -1 in `tileOf` and is shown unshadowed, never with an old shadow.
 * A light whose rank changed reads the tile of its old class until one of its new class is drawn (`lendTiles.ts`).
 */
export class TileSchedule {
  /** Per beam instance: its tile when the tile holds this frame's depth of the beam, else -1. */
  readonly tileOf: Int16Array;
  /** The tiles to draw this frame, in order, and the beam instance each is drawn for. */
  readonly draws: Int16Array;
  readonly drawLights: Int16Array;
  drawCount = 0;
  readonly #heroes: number;
  readonly #caps: ScheduleCaps;
  readonly #state: TileState;
  #cursor = 0;

  constructor(layout: AtlasLayout, caps: ScheduleCaps, maxLights: number) {
    const tiles = tileCount(layout);
    this.#heroes = layout.hero.count;
    this.#caps = caps;
    this.tileOf = new Int16Array(maxLights).fill(-1);
    this.draws = new Int16Array(tiles);
    this.drawLights = new Int16Array(tiles);
    this.#state = {
      frame: 0,
      epoch: 0,
      words: new Uint32Array(0),
      loans: new Int16Array(maxLights).fill(-1),
      keys: new Uint32Array(tiles * KEY),
      epochs: new Uint32Array(tiles),
      late: new Uint8Array(tiles),
      claimed: new Uint32Array(tiles),
      lights: new Int16Array(tiles),
      tileOf: this.tileOf,
    };
  }

  /** Plans one frame. `words` are the bits of the beam rows (`rowWords`); `epoch` (never 0) is the scenery's. */
  plan(words: Uint32Array, picks: Picks, epoch: number): void {
    const { maxDraws, maxSecondary } = this.#caps;
    const { claimed, epochs, late } = this.#state;
    const heroes = this.#heroes;
    const span = claimed.length - heroes;
    this.#state.frame += 1;
    this.#state.epoch = epoch;
    this.#state.words = words;
    this.tileOf.fill(-1);
    this.drawCount = 0;
    claimAll(this.#state, picks, heroes);
    for (let k = 0; k < picks.heroes && this.drawCount < maxDraws; k++) {
      const tile = read(this.tileOf, read(picks.lights, k));
      if (tile >= 0 && epochs[tile] !== epoch) this.#draw(tile, epoch);
    }
    const turn = this.#cursor;
    for (let step = 0, drawn = 0; step < span && drawn < maxSecondary && this.drawCount < maxDraws; step++) {
      const tile = heroes + ((turn + step) % span);
      // a late tile is read as it is, and is drawn again here (`stepTiles.ts`)
      if (claimed[tile] !== this.#state.frame || (epochs[tile] === epoch && late[tile] !== 1)) continue;
      this.#draw(tile, epoch);
      drawn += 1;
      this.#cursor = (tile - heroes + 1) % span;
    }
    settleTiles(this.#state, picks);
  }

  /** The draws from index `from` on did not happen (the frame ran out of time): their lights are unshadowed. */
  cancel(from: number): void {
    for (let k = this.drawCount - 1; k >= from; k--) {
      const tile = read(this.draws, k);
      this.#state.epochs[tile] = 0;
      if (tile >= this.#heroes) this.#cursor = tile - this.#heroes;
      const { loans } = this.#state;
      // a light that was to change to this tile still reads the tile it was lent
      for (let l = 0; l < loans.length; l++) if (this.tileOf[l] === tile) this.tileOf[l] = read(loans, l);
    }
    this.drawCount = Math.min(this.drawCount, from);
  }

  #draw(tile: number, epoch: number): void {
    this.draws[this.drawCount] = tile;
    this.drawLights[this.drawCount] = read(this.#state.lights, tile);
    this.drawCount += 1;
    this.#state.epochs[tile] = epoch;
    this.#state.late[tile] = 0;
  }
}
