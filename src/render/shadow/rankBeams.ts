import { ROW } from '../beams/packBeam';
import type { AtlasLayout } from './atlasLayout';
import { beamFrame, FRAME, read } from './beamFrame';
import { coneScreenArea } from './coneArea';

/**
 * Orders the beams of a frame by how much a shadow in them would show: the peak of the row's colour times intensity
 * (floats 8 to 10) times the screen part of the cone. The arrays live as long as the ranker: a frame allocates no row.
 */
export class BeamRanker {
  /** Beam instances, best first; `rank` returns how many are filled. */
  readonly order: Uint16Array;
  /** The score of every instance of the last `rank`. */
  readonly scores: Float32Array;
  readonly #frame = new Float64Array(FRAME);
  // equal scores keep the instance order, so the same frame always gives the same tiles
  readonly #byScore = (a: number, b: number): number => read(this.scores, b) - read(this.scores, a) || a - b;

  constructor(maxLights: number) {
    this.order = new Uint16Array(maxLights);
    this.scores = new Float32Array(maxLights);
  }

  /** Scores the first `count` rows and returns how many have a score above 0: a dark or unseen beam is not ranked. */
  rank(rows: ArrayLike<number>, count: number, viewProjection: ArrayLike<number>): number {
    let ranked = 0;
    for (let i = 0; i < count; i++) {
      const at = i * ROW;
      const peak = Math.max(read(rows, at + 8), read(rows, at + 9), read(rows, at + 10));
      let score = 0;
      if (peak > 0) {
        beamFrame(rows, i, this.#frame);
        score = peak * coneScreenArea(this.#frame, viewProjection);
      }
      this.scores[i] = score;
      if (score > 0) this.order[ranked++] = i;
    }
    this.order.subarray(0, ranked).sort(this.#byScore);
    return ranked;
  }
}

/** The beams that get a tile this frame, best first: `heroes` hero lights, then the secondary lights up to `count`. */
export interface Picks {
  readonly lights: Int16Array;
  heroes: number;
  count: number;
}

export const createPicks = (tiles: number): Picks => ({ lights: new Int16Array(tiles), heroes: 0, count: 0 });

/**
 * Picks the lights of the tiles from `order`, the ranked beams, best first. The best `hero.count` lights always get a tile: the caster
 * test is five rays and can miss a thin caster, and a miss shows most on these. After them a light gets a tile only
 * when `hasCaster` finds something in its cone; a light without a caster is drawn unshadowed, which is then exact.
 * `hasCaster` is asked in rank order and only until the secondary tiles are full.
 */
export function pickLights(
  order: ArrayLike<number>,
  layout: AtlasLayout,
  hasCaster: (light: number) => boolean,
  out: Picks,
): void {
  const ranked = order.length;
  const heroes = Math.min(ranked, layout.hero.count);
  let count = 0;
  for (; count < heroes; count++) out.lights[count] = read(order, count);
  const end = heroes + layout.secondary.count;
  for (let k = heroes; k < ranked && count < end; k++) {
    const light = read(order, k);
    if (hasCaster(light)) out.lights[count++] = light;
  }
  out.heroes = heroes;
  out.count = count;
}
