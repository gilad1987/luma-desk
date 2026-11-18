import type { Scene } from 'three';
import type { MeshFailure } from '../../render/mvr/MeshLibrary';
import type { MvrStage, MvrStageInput } from '../../render/mvr/MvrStage';

/**
 * The MVR scenery, created on the first MVR load. Each three.js object draws its uuid from the seeded Math.random
 * (decision 24), so an `MvrStage` built at boot would change the random-call golden of a desk that never imports.
 * The module is a lazy chunk (`import()`), like the parser it uses, so the boot bundle does not grow.
 */
export class LazyMvrStage {
  readonly #scene: Pick<Scene, 'add'>;
  #stage: MvrStage | undefined;
  #loading: Promise<MvrStage> | undefined;
  #showing = false;

  constructor(scene: Pick<Scene, 'add'>) {
    this.#scene = scene;
  }

  /**
   * Loads the scenery chunk and adds the scenery group to the scene, once. The flows call it before they change the
   * stage, so a chunk that does not load (offline, a new deploy) rejects while the stage is still as it was. A failed
   * load is forgotten, so the next MVR load tries the chunk again.
   */
  async load(): Promise<void> {
    await this.#loaded();
  }

  /** Builds the scenery of `input` (see `MvrStage.show`), after `load`. */
  async show(input: MvrStageInput): Promise<readonly MeshFailure[]> {
    this.#showing = true;
    return (await this.#loaded()).show(input);
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
