import { emitters } from './emitters';
import type { SceneDepth } from './SceneDepth';

/** What the stage post effects drive of the MVR chain; narrow so tests can pass a plain fake. */
export interface MvrChain {
  readonly sceneDepth: SceneDepth;
  setSize(width: number, height: number): void;
  render(isGlowOn: boolean): void;
  dispose(): void;
}

/**
 * The MVR post chain, created when an MVR stage is first drawn and freed when the stage changes. Its three.js
 * objects draw their uuids from the seeded Math.random (decision 24), so a chain built at boot would change the
 * random-call golden of a desk that never imports. `create` loads a lazy chunk, so the boot bundle does not grow.
 */
export class LazyMvrChain {
  readonly #create: () => Promise<MvrChain>;
  #isMvrShown: () => boolean = () => false;
  #chain: MvrChain | undefined;
  /** The identity of the MVR stage the chain loads for; a chain that arrives for an older one is freed. */
  #session: object | undefined;
  /** The latest load; it settles with success or failure, so a wait on it never rejects. */
  #pending: Promise<void> = Promise.resolve();
  #failed = false;
  #width = 0;
  #height = 0;

  constructor(create: () => Promise<MvrChain>) {
    this.#create = create;
  }

  /** Sets the test for "an MVR stage is shown"; the app wiring owns it, as render does not know the stage kind. */
  follow(isMvrShown: () => boolean): void {
    this.#isMvrShown = isMvrShown;
  }

  /** The chain that draws now; undefined for a built-in stage and while the chunk loads. */
  get current(): MvrChain | undefined {
    return this.#chain;
  }

  /** True when the load for the MVR stage shown now failed: this stage stays on the built-in chain and its decals. */
  get hasFailed(): boolean {
    return this.#failed;
  }

  /** Keeps the size for a chain that is created later. */
  setSize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
    this.#chain?.setSize(width, height);
  }

  /** Call once per frame: starts the load on the first MVR frame and frees the chain on the first frame without. */
  select(): MvrChain | undefined {
    if (!this.#isMvrShown()) this.#free();
    else if (this.#session === undefined) this.#load((this.#session = {}));
    return this.#chain;
  }

  /**
   * Resolves when the latest load ended (at once if none started), so a memory reading of the test API counts the
   * chain's targets: the load is async and can end after the frames a reading draws. It never rejects.
   */
  ready(): Promise<void> {
    return this.#pending;
  }

  #load(session: object): void {
    this.#pending = this.#create().then(
      (chain) => {
        if (this.#session !== session) {
          chain.dispose();
          return;
        }
        chain.setSize(this.#width, this.#height);
        this.#chain = chain;
        emitters.isHdr = true;
      },
      // a chunk that does not load (offline, a new deploy) or a chain that cannot be made leaves this stage on the
      // built-in chain; the warning keeps the cause visible, as the stage still draws and nothing else reports it
      (error: unknown) => {
        if (this.#session === session) this.#failed = true;
        console.warn('MVR post chain not created; the built-in chain stays', error);
      },
    );
  }

  #free(): void {
    this.#session = undefined;
    this.#failed = false;
    this.#chain?.dispose();
    this.#chain = undefined;
    emitters.isHdr = false;
  }
}
