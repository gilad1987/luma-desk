import type { DepthTexture, WebGLRenderer } from 'three';
import { AtlasTarget } from './AtlasTarget';
import { tileCount } from './atlasLayout';
import { beamFrame, FRAME, RANGE, read } from './beamFrame';
import type { RayProbe } from './coneCasters';
import { LightPicker } from './LightPicker';
import { SHADOW_DEFAULTS, type ShadowCasters, type ShadowConfig, type ShadowOptions } from './shadowConfig';
import { aimTileCamera, createTileCamera } from './tileFrustum';
import { createTileMaps, setTileDepth, type TileMaps } from './tileMaps';
import { TileSchedule } from './TileSchedule';

/**
 * Depth maps for the spot beams that most need a shadow. Call `update` once per frame with the beam rows in the
 * order of the beam pass. A sampler then reads, per beam instance, `tileOf` (-1: draw the beam unshadowed) and, per
 * tile, `maps`, with `texture` as `tShadowAtlas` (see `glsl/shadowTile.glsl`).
 */
export class ShadowAtlas {
  readonly maps: TileMaps;
  /** The atlas as `tShadowAtlas`. */
  readonly texture: DepthTexture;
  /** The last update: tiles drawn, the triangles of each draw, and cones traced. */
  readonly stats: { draws: number; tests: number; readonly triangles: Int32Array };
  readonly config: ShadowConfig;
  /** The plan of the last update: `draws` holds the tiles drawn, in order. */
  readonly schedule: TileSchedule;
  readonly #renderer: WebGLRenderer;
  readonly #casters: ShadowCasters;
  readonly #now: () => number;
  readonly #target: AtlasTarget;
  readonly #picker: LightPicker;
  readonly #camera = createTileCamera();
  readonly #frame = new Float64Array(FRAME);

  constructor(renderer: WebGLRenderer, casters: ShadowCasters, probe: RayProbe, options: ShadowOptions = {}) {
    const config = options.config ?? SHADOW_DEFAULTS;
    this.config = config;
    this.#renderer = renderer;
    this.#casters = casters;
    this.#now = options.now ?? (() => performance.now());
    this.maps = createTileMaps(config.layout);
    this.stats = { draws: 0, tests: 0, triangles: new Int32Array(tileCount(config.layout)) };
    this.#target = new AtlasTarget(config.layout);
    this.texture = this.#target.texture;
    this.schedule = new TileSchedule(config.layout, config, config.maxLights);
    this.#picker = new LightPicker(config, probe);
  }

  /** Per beam instance: its tile, or -1 when the beam has none or the tile is not this frame's. */
  get tileOf(): Int16Array {
    return this.schedule.tileOf;
  }

  /** Ranks the first `count` rows, gives tiles and draws the tiles that are out of date, within the caps. */
  update(rows: Float32Array, count: number, viewProjection: ArrayLike<number>): void {
    const start = this.#now();
    const { schedule } = this;
    this.#casters.sync();
    const epoch = this.#casters.epoch;
    // the picker reads the bits of the rows in `pick`, so `words` is read after it
    const picks = this.#picker.pick(rows, count, viewProjection, epoch);
    schedule.plan(this.#picker.words, picks, epoch);
    for (let k = 0; k < schedule.drawCount; k++) {
      if (k > 0 && this.#now() - start > this.config.maxMs) schedule.cancel(k);
      else this.#draw(rows, k);
    }
    this.stats.draws = schedule.drawCount;
    this.stats.tests = this.#picker.tests;
  }

  #draw(rows: Float32Array, k: number): void {
    const tile = read(this.schedule.draws, k);
    beamFrame(rows, read(this.schedule.drawLights, k), this.#frame);
    aimTileCamera(this.#camera, this.#frame);
    this.#casters.cull(this.#camera);
    const range = read(this.#frame, RANGE);
    this.#casters.invRange.value = 1 / range;
    setTileDepth(this.maps, tile, range, this.config.bias);
    this.stats.triangles[k] = this.#target.draw(this.#renderer, this.#casters.scene, this.#camera, tile);
  }

  dispose(): void {
    this.#target.dispose();
  }
}
