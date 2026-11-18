import type { Object3D } from 'three';
import type { ShadowConfig } from './shadowConfig';

/**
 * The shadow parts of one imported stage, made when they are first asked for and freed when the stage changes.
 * A built-in stage has no scenery root, so nothing is ever made for it: its three.js objects would draw uuids from
 * the seeded Math.random (decision 24) and change the random-call golden. It is off until `enable`; while no
 * sampler reads the atlas, only the test hook switches it on.
 */
export class LazyShadow<Parts extends { dispose(): void }> {
  readonly #create: (root: Object3D, config: ShadowConfig) => Parts;
  #root: Object3D | null = null;
  #config: ShadowConfig | undefined;
  #parts: Parts | undefined;

  constructor(create: (root: Object3D, config: ShadowConfig) => Parts) {
    this.#create = create;
  }

  /** The scenery group of the shown MVR stage, or null when the stage has none: the parts of the old one are freed. */
  setScenery(root: Object3D | null): void {
    this.#free();
    this.#root = root;
  }

  /** Switches the shadows on with a config, or off with undefined; either way the parts are made anew. */
  enable(config: ShadowConfig | undefined): void {
    this.#free();
    this.#config = config;
  }

  /** The parts of the shown stage; undefined while off and for a stage without scenery. */
  get current(): Parts | undefined {
    if (!this.#root || !this.#config) return undefined;
    this.#parts ??= this.#create(this.#root, this.#config);
    return this.#parts;
  }

  #free(): void {
    this.#parts?.dispose();
    this.#parts = undefined;
  }
}
