import type { Rig } from '../domain/rig';
import type { StageDesign } from '../domain/stage/StageDesign';
import type { Cue } from '../engine/CueList';
import { presetFnsOf } from '../engine/stage/presetFnsOf';
import type { RigSource } from '../engine/stage/RigSource';
import { buildAutoGroups } from './autoGroups';
import type { LookOptions } from './AutoSettings';
import type { AutoStyle } from './AutoStyle';
import { addActiveGroups } from './look/addActiveGroups';
import { addGoboSpots } from './look/addGoboSpots';
import { addStrobesAndScreen } from './look/addStrobesAndScreen';
import { addWashes } from './look/addWashes';
import { LookDraft, type LookSource } from './look/LookDraft';
import type { Section } from './sections';

/**
 * Generates auto-show looks for a rig. The random source is injected so tests can seed it; it defaults to
 * `Math.random` (not a private generator) because the test build seeds `Math.random` itself and the golden looks
 * depend on that (quirk E4). The build steps run in a fixed order, which is also the order of the random draws.
 * Without a `source` it works on the fixed built-in `rig` and presets, exactly as before the stage builder; with one
 * it follows the current stage and never builds the built-in groups (`rig` is then not read).
 */
export class LookGenerator {
  readonly #random: () => number;
  readonly #stage: RigSource | undefined;
  #current: LookSource;
  #design: StageDesign | undefined;

  constructor(rig: Rig, random: () => number = Math.random, source?: RigSource) {
    this.#random = random;
    this.#stage = source;
    this.#current = source ? this.#stageSource(source) : { rig, groups: buildAutoGroups(rig), random };
  }

  /** A new look for one section of a style, as cue 1 of the auto executor (with its `sec` label, quirk E7). */
  generate(style: AutoStyle, section: Section, options: LookOptions): Cue {
    const look = new LookDraft(this.#currentLookSource(), style, section, options);
    addWashes(look);
    addGoboSpots(look);
    addActiveGroups(look);
    addStrobesAndScreen(look);
    return look.toCue();
  }

  /**
   * The groups and presets of the current stage, rebuilt only when its design changes: the look builder compares
   * groups by identity, and `presetFnsOf` builds new functions on each call. Reads the stage at call time, so a stage
   * change needs no re-wiring and no `rigChanged` subscription.
   */
  #currentLookSource(): LookSource {
    const stage = this.#stage;
    if (stage && stage.design !== this.#design) this.#current = this.#stageSource(stage);
    return this.#current;
  }

  /** The look source of `stage`'s rig, design and presets; remembers the design it was built for. */
  #stageSource(stage: RigSource): LookSource {
    const { rig, design, frame } = stage;
    this.#design = design;
    return { rig, groups: buildAutoGroups(rig, design), random: this.#random, fns: presetFnsOf(frame) };
  }
}
