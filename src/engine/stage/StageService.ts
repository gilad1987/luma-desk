import type { Rig } from '../../domain/rig/Rig';
import { rigFromDesign } from '../../domain/stage/deriveRig';
import { FIXTURE_SOFT_LIMIT, type StageDesign } from '../../domain/stage/StageDesign';
import { frameOf, type StageFrame } from '../../domain/stage/StageFrame';
import type { EngineBus } from '../events';
import type { RigChangeCause } from './rigChanged';
import type { RigSource } from './RigSource';

/** What main.ts gives the service at boot. */
export interface StageServiceOptions {
  /** The stage of the original desk; `isBuiltIn` compares with this object by identity. */
  readonly builtIn: StageDesign;
  /** The stage saved in the show, if any; without one the service starts on `builtIn`. */
  readonly initial?: StageDesign | undefined;
  /** The toast text for a rig above `FIXTURE_SOFT_LIMIT`; injected because the engine holds no UI language. */
  readonly tooManyFixtures: (n: number) => string;
}

/**
 * The one place that replaces the rig at runtime (contract §2). It sets rig, design, frame and cause together before
 * it emits, so every `rigChanged` listener sees one consistent state. It does not own the groups, presets or scene of
 * a stage: those react to `rigChanged`.
 *
 * Emits `rigChanged`, `showChanged` (for kept edits) and a `message` toast (above the soft limit); listens to nothing.
 * Gets the `EngineBus` and `StageServiceOptions` (built-in stage, saved stage, toast text) from main.ts. The bus is
 * synchronous and calls listeners in subscribe order, which is their construction order in main.ts (plan §3.2):
 * Selection, GroupLibrary, PresetLibrary, MissingFixtureNotice, AutoShow, the render StageScene, then the UI.
 */
export class StageService implements RigSource {
  readonly #bus: EngineBus;
  readonly #options: StageServiceOptions;
  #design: StageDesign;
  #rig: Rig;
  #frame: StageFrame;
  #cause: RigChangeCause = 'boot';
  #isEmitting = false;

  /** Derives the first rig without an event, so nothing is built twice at boot. */
  constructor(bus: EngineBus, options: StageServiceOptions) {
    this.#bus = bus;
    this.#options = options;
    this.#design = options.initial ?? options.builtIn;
    this.#rig = rigFromDesign(this.#design);
    this.#frame = frameOf(this.#design);
  }

  get rig(): Rig {
    return this.#rig;
  }

  get design(): StageDesign {
    return this.#design;
  }

  get frame(): StageFrame {
    return this.#frame;
  }

  get cause(): RigChangeCause {
    return this.#cause;
  }

  /** True for the built-in design object itself (identity), so an equal copy still counts as custom. */
  get isBuiltIn(): boolean {
    return this.#design === this.#options.builtIn;
  }

  /**
   * Replaces the rig and announces it once. The show is marked changed only for edits the operator keeps (`builder`,
   * `import`); a show load or a preview is not a change to save. The fixture warning skips previews, which the
   * operator has not committed to.
   *
   * @throws Error when a listener re-enters `apply` during its emit: later listeners would get a stale design. This
   * error also aborts the current emit, so later listeners miss that event too; fail fast, as re-entry is a code bug.
   */
  apply(design: StageDesign, cause: Exclude<RigChangeCause, 'boot'>): void {
    if (this.#isEmitting) {
      throw new Error(`StageService.apply: a listener re-entered with ${cause} while the ${this.#cause} apply emits`);
    }
    const rig = rigFromDesign(design);
    const frame = frameOf(design);
    this.#design = design;
    this.#rig = rig;
    this.#frame = frame;
    this.#cause = cause;
    this.#isEmitting = true;
    try {
      this.#bus.emit('rigChanged', { design });
      if (cause === 'builder' || cause === 'import') this.#bus.emit('showChanged', undefined);
      const n = rig.fixtures.length;
      if (n > FIXTURE_SOFT_LIMIT && cause !== 'preview') {
        this.#bus.emit('message', { kind: 'toast', text: this.#options.tooManyFixtures(n) });
      }
    } finally {
      this.#isEmitting = false;
    }
  }

  // G8 slot: MVR adds `updateMeta(patch)` (no rig rebuild). Stage Builder does NOT define it.
}
