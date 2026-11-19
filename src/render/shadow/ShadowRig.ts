import { Matrix4, type Camera, type Object3D, type WebGLRenderer } from 'three';
import { beamVolume } from '../beams/beamVolume';
import { ROW } from '../beams/packBeam';
import type { Scenery } from '../surface/collectScenery';
import { RECT, tileRects } from './atlasLayout';
import { AtlasView } from './AtlasView';
import { read } from './beamFrame';
import { CasterScene } from './CasterScene';
import { sceneryProbe } from './sceneryProbe';
import { ShadowAtlas } from './ShadowAtlas';
import type { ShadowConfig } from './shadowConfig';

/** What one update did, as plain numbers for the test hook. */
export interface ShadowReport {
  /** Lit beams this frame, and how many of them have a tile with this frame's depth. */
  readonly lights: number;
  readonly tiled: number;
  /** Cones traced for casters. */
  readonly tests: number;
  /** The triangles of each tile drawn; its length is the number of draws. */
  readonly triangles: readonly number[];
  /** The tile of each draw, in the same order. */
  readonly tiles: readonly number[];
}

export interface ShadowRigDeps {
  readonly renderer: WebGLRenderer;
  /** The scenery group of the shown MVR stage. */
  readonly root: Object3D;
  readonly config: ShadowConfig;
  /** The scenery of the beam hit test (`SurfaceHit.sceneryHit`), for the caster test. */
  readonly scenery: Scenery | null;
  /** The objects whose meshes cast besides the scenery (fixture bodies, figures). A new array: they were rebuilt. */
  readonly bodies?: () => readonly Object3D[];
}

/**
 * The shadow parts of one MVR stage, put together: the casters, the ray probe, the atlas and its debug view. It
 * reads the beams of the frame from the beam batch, in the order of the beam pass.
 */
export class ShadowRig {
  readonly casters: CasterScene;
  readonly atlas: ShadowAtlas;
  readonly view: AtlasView;
  readonly #deps: ShadowRigDeps;
  readonly #rows: Float32Array;
  readonly #viewProjection = new Matrix4();
  #bodies: readonly Object3D[] | undefined;
  #drawn = false;

  constructor(deps: ShadowRigDeps) {
    this.#deps = deps;
    this.#rows = new Float32Array(deps.config.maxLights * ROW);
    this.casters = new CasterScene(deps.root);
    this.atlas = new ShadowAtlas(deps.renderer, this.casters, sceneryProbe(deps.scenery), { config: deps.config });
    this.view = new AtlasView(this.atlas.texture);
  }

  /** Updates the atlas for the beams of the current frame as `camera` sees them. */
  frame(camera: Camera): ShadowReport {
    const bodies = this.#deps.bodies?.();
    if (bodies && bodies !== this.#bodies) this.casters.setBodies((this.#bodies = bodies));
    const lights = beamVolume.batch?.flush(this.#rows) ?? 0;
    this.#viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.atlas.update(this.#rows, lights, this.#viewProjection.elements);
    const { stats, tileOf, schedule } = this.atlas;
    this.#drawn ||= stats.draws > 0;
    return {
      lights,
      tiled: tileOf.subarray(0, lights).filter((tile) => tile >= 0).length,
      tests: stats.tests,
      triangles: [...stats.triangles.subarray(0, stats.draws)],
      tiles: [...schedule.draws.subarray(0, stats.draws)],
    };
  }

  /** The depth at `n` x `n` points of one tile (see `AtlasView.read`). */
  readTile(tile: number, n: number): number[] {
    // before the first draw the atlas has no GPU texture, and the view would sample an unset one
    if (!this.#drawn) return [];
    const { layout } = this.atlas.config;
    const rects = tileRects(layout);
    const [x = 0, y = 0, side = 0] = [0, 1, 2].map((i) => read(rects, tile * RECT + i) / layout.size);
    return [...this.view.read(this.#deps.renderer, [x, y, side, side], n)];
  }

  /** Draws the atlas over the canvas (see `AtlasView.show`); nothing before the first tile is drawn. */
  show(): void {
    if (this.#drawn) this.view.show(this.#deps.renderer);
  }

  dispose(): void {
    this.view.dispose();
    this.atlas.dispose();
    this.casters.dispose();
  }
}
