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

  constructor(scene: Pick<Scene, 'add'>) {
    this.#scene = scene;
  }

  /** Builds the scenery of `input` (see `MvrStage.show`); the first call adds the scenery group to the scene. */
  async show(input: MvrStageInput): Promise<readonly MeshFailure[]> {
    this.#stage ??= await this.#create();
    return this.#stage.show(input);
  }

  /** Shows every layer except these uuids; nothing to do before the first load. */
  setHiddenLayers(uuids: readonly string[]): void {
    this.#stage?.setHiddenLayers(uuids);
  }

  /** Frees the scenery, for a stage that is not an MVR import. */
  dispose(): void {
    this.#stage?.dispose();
  }

  async #create(): Promise<MvrStage> {
    const { MvrStage } = await import('../../render/mvr/MvrStage');
    const stage = new MvrStage();
    this.#scene.add(stage.group);
    return stage;
  }
}
