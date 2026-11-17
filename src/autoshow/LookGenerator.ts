import type { Rig } from '../domain/rig';
import type { Cue } from '../engine/CueList';
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
 */
export class LookGenerator {
  readonly #source: LookSource;

  constructor(rig: Rig, random: () => number = Math.random) {
    this.#source = { rig, groups: buildAutoGroups(rig), random };
  }

  /** A new look for one section of a style, as cue 1 of the auto executor (with its `sec` label, quirk E7). */
  generate(style: AutoStyle, section: Section, options: LookOptions): Cue {
    const look = new LookDraft(this.#source, style, section, options);
    addWashes(look);
    addGoboSpots(look);
    addActiveGroups(look);
    addStrobesAndScreen(look);
    return look.toCue();
  }
}
