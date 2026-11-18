import type { Rig } from '../../domain/rig/Rig';
import { rigFromDesign } from '../../domain/stage/deriveRig';
import { isSameData } from '../../domain/stage/sameData';
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

  /** The design of the factory stage: the boot stage without a saved one, and what a show without `stage` means. */
  get builtIn(): StageDesign {
    return this.#options.builtIn;
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
    this.#announcer.checkIdle('apply', cause);
    const rig = rigFromDesign(design);
    const frame = frameOf(design);
    this.#design = design;
    this.#rig = rig;
    this.#frame = frame;
    this.#cause = cause;
    this.#announcer.announce(design, cause, rig.fixtures.length);
  }

  /**
   * Replaces the design with one that differs only in data that is not the rig, today the MVR `hiddenLayers`, and
   * emits `showChanged` to save it (G8). No rig rebuild and no `rigChanged`: a layer toggle must not reset groups,
   * presets and scene.
   * @throws Error on re-entry during an emit, for a design without MVR data, or when `design` changes rig data (that
   * needs `apply`).
   */
  updateMeta(design: StageDesign): void {
    this.#announcer.checkIdle('updateMeta', 'a hiddenLayers change');
    if (!design.mvr) throw new Error('StageService.updateMeta: the design has no MVR data; use apply');
    const sameRig = isSameData(rigData(design), rigData(this.#design));
    if (!sameRig) throw new Error('StageService.updateMeta: the design changes rig data; use apply');
    this.#design = design;
    this.#announcer.announceMeta();
  }
}

/** The design with the data `updateMeta` may change taken out, so the rest can be compared. */
function rigData(design: StageDesign): StageDesign {
  return design.mvr ? { ...design, mvr: { ...design.mvr, hiddenLayers: [] } } : design;
}
