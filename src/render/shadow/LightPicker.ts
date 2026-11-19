import { CasterCheck, type RayProbe } from './coneCasters';
import { BeamRanker, createPicks, pickLights, type Picks } from './rankBeams';
import { RestTracker } from './restTracker';
import type { ShadowConfig } from './shadowConfig';
import { tileCount } from './atlasLayout';
import { rowWords } from './tileKey';

/**
 * Chooses the lights of the tiles for one frame. The best lights by rank are the hero lights and always get a tile.
 * A light after them gets one only when it is at rest and its cone holds a caster: a secondary tile is drawn at most
 * once in several frames, so on a moving light it would show a shadow in one frame of eight, which reads as flicker.
 * A moving light past the hero tiles is drawn unshadowed until it stops, and it must then rest longer than a light
 * that changed once; a light that takes single small steps stays at rest (see `RestTracker`).
 */
export class LightPicker {
  readonly picks: Picks;
  /** The bits of the rows of the last `pick`. */
  words: Uint32Array = new Uint32Array(0);
  readonly #config: ShadowConfig;
  readonly #ranker: BeamRanker;
  readonly #check: CasterCheck;
  readonly #rest: RestTracker;
  #rows: Float32Array = new Float32Array(0);
  #epoch = 0;
  // the rest test comes first: it costs nothing, and a rig that moves as a whole then traces no ray
  readonly #takes = (light: number): boolean =>
    this.#rest.atRest[light] === 1 && this.#check.has(this.#rows, this.words, light, this.#epoch);

  constructor(config: ShadowConfig, probe: RayProbe) {
    this.#config = config;
    this.picks = createPicks(tileCount(config.layout));
    this.#ranker = new BeamRanker(config.maxLights);
    this.#check = new CasterCheck(probe, config.maxTests);
    this.#rest = new RestTracker(config.maxLights, config.restFrames, config);
  }

  /** Cones traced for casters by the last `pick`. */
  get tests(): number {
    return this.#check.tests;
  }

  /** Picks among the first `count` rows as the camera of `viewProjection` sees them, at scenery epoch `epoch`. */
  pick(rows: Float32Array, count: number, viewProjection: ArrayLike<number>, epoch: number): Picks {
    if (rows !== this.#rows) {
      this.#rows = rows;
      this.words = rowWords(rows);
    }
    this.#epoch = epoch;
    const lights = Math.min(count, this.#config.maxLights);
    this.#rest.observe(this.words, lights);
    this.#check.begin();
    const ranked = this.#ranker.rank(rows, lights, viewProjection);
    pickLights(this.#ranker.order.subarray(0, ranked), this.#config.layout, this.#takes, this.picks);
    return this.picks;
  }
}
