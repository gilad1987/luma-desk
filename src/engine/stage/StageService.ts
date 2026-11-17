import type { Rig } from '../../domain/rig/Rig';
import { rigFromDesign } from '../../domain/stage/deriveRig';
import { FIXTURE_SOFT_LIMIT, type StageDesign } from '../../domain/stage/StageDesign';
import { frameOf, type StageFrame } from '../../domain/stage/StageFrame';
import type { EngineBus } from '../events';
import type { RigChangeCause } from './rigChanged';

/**
 * The current rig and the stage it came from. Everyone who needs the rig holds one and reads `.rig` at call time, so a
 * rig change needs no re-wiring; only caches subscribe to `rigChanged`.
 */
export interface RigSource {
  readonly rig: Rig;
  readonly design: StageDesign;
  readonly frame: StageFrame;
  /** The cause of the last change; `boot` until the first `apply`. */
  readonly cause: RigChangeCause;
}

/** What the service needs from outside the engine. */
export interface StageServiceOptions {
  /** The toast text for a rig above `FIXTURE_SOFT_LIMIT`; injected because the engine holds no UI language. */
  readonly tooManyFixtures: (n: number) => string;
}

/**
 * The one place that replaces the rig at runtime (contract §2). It sets rig, design, frame and cause together before
 * it emits, so every `rigChanged` listener sees one consistent state.
 */
export class StageService implements RigSource {
  readonly #bus: EngineBus;
  readonly #builtIn: StageDesign;
  readonly #options: StageServiceOptions;
  #design: StageDesign;
  #rig: Rig;
  #frame: StageFrame;
  #cause: RigChangeCause = 'boot';

  /** Derives the first rig without an event, so nothing is built twice at boot. `initial` is a saved stage, if any. */
  constructor(bus: EngineBus, builtIn: StageDesign, initial: StageDesign | undefined, options: StageServiceOptions) {
    this.#bus = bus;
    this.#builtIn = builtIn;
    this.#options = options;
    this.#design = initial ?? builtIn;
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
    return this.#design === this.#builtIn;
  }

  /**
   * Replaces the rig and announces it once. The show is marked changed only for edits the operator keeps (`builder`,
   * `import`); a show load or a preview is not a change to save. The fixture warning skips previews, which the
   * operator has not committed to.
   */
  apply(design: StageDesign, cause: Exclude<RigChangeCause, 'boot'>): void {
    const rig = rigFromDesign(design);
    const frame = frameOf(design);
    this.#design = design;
    this.#rig = rig;
    this.#frame = frame;
    this.#cause = cause;
    this.#bus.emit('rigChanged', { design });
    if (cause === 'builder' || cause === 'import') this.#bus.emit('showChanged', undefined);
    const n = rig.fixtures.length;
    if (n > FIXTURE_SOFT_LIMIT && cause !== 'preview') {
      this.#bus.emit('message', { kind: 'toast', text: this.#options.tooManyFixtures(n) });
    }
  }

  // G8 slot: MVR adds `updateMeta(patch)` (no rig rebuild). Stage Builder does NOT define it.
}
