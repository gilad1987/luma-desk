import type { Rig } from '../../domain/rig/Rig';
import { rigFromDesign } from '../../domain/stage/deriveRig';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { frameOf, type StageFrame } from '../../domain/stage/StageFrame';
import type { EngineBus } from '../events';
import { RigAnnouncer } from './RigAnnouncer';
import type { RigChangeCause } from './rigChanged';
import type { RigSource } from './RigSource';
import type { StageServiceOptions } from './StageServiceOptions';

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
  readonly #announcer: RigAnnouncer;
  readonly #options: StageServiceOptions;
  #design: StageDesign;
  #rig: Rig;
  #frame: StageFrame;
  #cause: RigChangeCause = 'boot';

  /** Derives the first rig without an event, so nothing is built twice at boot. */
  constructor(bus: EngineBus, options: StageServiceOptions) {
    this.#announcer = new RigAnnouncer(bus, options.tooManyFixtures);
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
   * Replaces the rig and announces it once; `RigAnnouncer` owns the event order, the toast policy and the guard.
   * @throws Error when a listener re-enters `apply` during its emit (see `RigAnnouncer.checkIdle`).
   */
  apply(design: StageDesign, cause: Exclude<RigChangeCause, 'boot'>): void {
    this.#announcer.checkIdle(cause);
    const rig = rigFromDesign(design);
    const frame = frameOf(design);
    this.#design = design;
    this.#rig = rig;
    this.#frame = frame;
    this.#cause = cause;
    this.#announcer.announce(design, cause, rig.fixtures.length);
  }

  // G8 slot: MVR adds `updateMeta(patch)` (no rig rebuild). Stage Builder does NOT define it.
  // An emitting updateMeta must use the same RigAnnouncer guard: `checkIdle` before any state change, as `apply` does.
}
