import type { Scene } from 'three';
import type { CameraViews } from '../../render/camera/CameraViews';
import type { MeshFailure } from '../../render/mvr/MeshLibrary';
import { mvrCameraBounds } from '../../render/mvr/mvrCameraBounds';
import type { MvrStage, MvrStageInput } from '../../render/mvr/MvrStage';

/** The render parts the scenery uses: the scene it adds its group to, and the camera views it fits to its bounds. */
export interface MvrSceneryRender {
  readonly scene: Pick<Scene, 'add'>;
  readonly views: Pick<CameraViews, 'fitTo' | 'setView' | 'currentView'>;
}

/**
 * The MVR scenery, created on the first MVR load. Each three.js object draws its uuid from the seeded Math.random
 * (decision 24), so an `MvrStage` built at boot would change the random-call golden of a desk that never imports.
 * The module is a lazy chunk (`import()`), like the parser it uses, so the boot bundle does not grow.
 */
export class LazyMvrStage {
  readonly #render: MvrSceneryRender;
  #stage: MvrStage | undefined;
  #loading: Promise<MvrStage> | undefined;
  #showing = false;

  constructor(render: MvrSceneryRender) {
    this.#render = render;
  }

  /**
   * Loads the scenery chunk and adds the scenery group to the scene, once. The flows call it before they change the
   * stage, so a chunk that does not load (offline, a new deploy) rejects while the stage is still as it was. A failed
   * load is forgotten, so the next MVR load tries the chunk again.
   */
  async load(): Promise<void> {
    await this.#loaded();
  }

  /**
   * Builds the scenery of `input` (see `MvrStage.show`), after `load`; a show that rejects leaves no scenery. A drawn
   * scenery then fits the camera views to it: the stage rebuild fits them to the design only, and an MVR venue often
   * reaches far past the deck. A dispose while the show builds skips the fit, as the next stage fits the views itself.
   */
  async show(input: MvrStageInput): Promise<readonly MeshFailure[]> {
    this.#showing = true;
    try {
      const failures = await (await this.#loaded()).show(input);
      if (this.#showing) this.#fitViews(input);
      return failures;
    } catch (error) {
      this.#showing = false;
      throw error;
    }
  }

  /** Shows every layer except these uuids; nothing to do before the first load. */
  setHiddenLayers(uuids: readonly string[]): void {
    this.#stage?.setHiddenLayers(uuids);
  }

  /**
   * True from a `show` until the next `dispose`, even for a file without meshes; the e2e reads it, as the 3D view is
   * not inspectable. A dispose while a show still builds wins, as in `MvrStage`.
   */
  get hasScenery(): boolean {
    return this.#showing;
  }

  /** Frees the scenery, for a stage that is not an MVR import. */
  dispose(): void {
    this.#showing = false;
    this.#stage?.dispose();
  }

  /** Fits the views to the design joined with the scenery and moves to the current view, as a stage rebuild does. */
  #fitViews({ design, geometry }: MvrStageInput): void {
    const { views } = this.#render;
    views.fitTo(mvrCameraBounds(design, geometry));
    views.setView(views.currentView);
  }

  #loaded(): Promise<MvrStage> {
    this.#loading ??= this.#create().catch((error: unknown) => {
      this.#loading = undefined;
      throw error;
    });
    return this.#loading;
  }

  async #create(): Promise<MvrStage> {
    const { MvrStage } = await import('../../render/mvr/MvrStage');
    const stage = new MvrStage();
    this.#render.scene.add(stage.group);
    this.#stage = stage;
    return stage;
  }
}
