import type { Scene } from 'three';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { MeshFailure } from '../../render/mvr/MeshLibrary';
import type { MvrStage, MvrStageInput } from '../../render/mvr/MvrStage';
import { MvrSceneryFit, type MvrDeskRender } from './MvrSceneryFit';

/** The render parts the scenery uses: the scene it adds its group to, and the views and beam surfaces it fits. */
export interface MvrSceneryRender extends MvrDeskRender {
  readonly scene: Pick<Scene, 'add'>;
}

/**
 * The MVR scenery, created on the first MVR load. Each three.js object draws its uuid from the seeded Math.random
 * (decision 24), so an `MvrStage` built at boot would change the random-call golden of a desk that never imports.
 * The module is a lazy chunk (`import()`), like the parser it uses, so the boot bundle does not grow.
 */
export class LazyMvrStage {
  readonly #scene: Pick<Scene, 'add'>;
  readonly #fit: MvrSceneryFit;
  #stage: MvrStage | undefined;
  #loading: Promise<MvrStage> | undefined;
  #showing = false;

  constructor({ scene, ...render }: MvrSceneryRender) {
    this.#scene = scene;
    this.#fit = new MvrSceneryFit(render);
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
   * scenery then fits the camera views and beam surfaces to it: the stage rebuild sets them from the design only. A
   * dispose while the show builds skips the fit, as the next stage sets its views and surfaces itself.
   */
  async show(input: MvrStageInput): Promise<readonly MeshFailure[]> {
    this.#showing = true;
    try {
      const failures = await (await this.#loaded()).show(input);
      if (this.#showing) this.#fit.fit(input.design, input.geometry);
      return failures;
    } catch (error) {
      this.#showing = false;
      throw error;
    }
  }

  /**
   * Shows every layer except these uuids, and fits the views and surfaces to the layers left shown; nothing to do
   * before the first load.
   */
  setHiddenLayers(uuids: readonly string[]): void {
    this.#stage?.setHiddenLayers(uuids);
    this.#fit.hide(uuids);
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
    this.#fit.forget();
    this.#stage?.dispose();
  }

  /** Fits the views and surfaces again to the shown scenery and `design`, after a same-file rebuild set its own. */
  refit(design: StageDesign): void {
    this.#fit.refit(design);
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
    this.#scene.add(stage.group);
    this.#stage = stage;
    return stage;
  }
}
