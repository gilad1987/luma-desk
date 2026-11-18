import { clamp } from '../../core';
import type { Rig } from '../../domain/rig';
import type { Cue, FixtureValues } from '../../engine/CueList';
import { buildCueVals, type CueValueSource } from '../../engine/cueValues';
import { PRESET_FNS, type PresetFns } from '../../engine/presetFunctions';
import type { PhaserInstance } from '../../engine/shared';
import type { AutoGroups } from '../autoGroups';
import type { LookOptions } from '../AutoSettings';
import type { AutoStyle } from '../AutoStyle';
import { colorByName, type NamedColor } from '../../engine/colorByName';
import { isBigSection, sectionName, type Section } from '../sections';
import { sectionEnergy } from '../SongStructure';

/** What every look is built against: the rig, its auto-show groups, the random source and the stage's presets. */
export interface LookSource {
  readonly rig: Rig;
  readonly groups: AutoGroups;
  readonly random: () => number;
  /** The presets aimed at the stage (`presetFnsOf`); missing means the built-in `PRESET_FNS`. */
  readonly fns?: PresetFns;
}

/**
 * One look while it is being built: the style and section it is for, its palette pick and the values and phasers
 * written so far. Every random draw goes through `pick` and `chance`, in the order the build steps call them, so a
 * seeded random source gives the same look as the original seeded `Math.random`.
 */
export class LookDraft {
  readonly vals: FixtureValues = {};
  readonly fx: PhaserInstance[] = [];
  readonly groups: AutoGroups;
  readonly style: AutoStyle;
  readonly section: Section;
  readonly options: LookOptions;
  /** Chorus, hook and drop: the sections that open everything up. */
  readonly big: boolean;
  /** The first palette colour by name; mono styles may pick it for a moving group. */
  readonly firstColorName: string;
  readonly c1: NamedColor;
  readonly c2: NamedColor;
  /** The position presets every build step aims with, so a look follows the stage it is built for. */
  readonly fns: PresetFns;
  private readonly source: LookSource;
  private readonly energy: number;

  constructor(source: LookSource, style: AutoStyle, section: Section, options: LookOptions) {
    this.source = source;
    this.groups = source.groups;
    this.fns = source.fns ?? PRESET_FNS;
    this.style = style;
    this.section = section;
    this.options = options;
    this.energy = clamp(options.energy * sectionEnergy(section), 0.05, 1.2);
    // the palette is the first random draw of every look
    const [n1, n2] = this.pick(style.pal);
    this.firstColorName = n1;
    this.c1 = colorByName(n1);
    this.c2 = colorByName(n2);
    this.big = isBigSection(section);
  }

  /** One item drawn at random. Lists are never empty by construction, so an empty one is a programming error. */
  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.source.random() * items.length)];
    if (item === undefined) throw new RangeError('Cannot pick from an empty list');
    return item;
  }

  /** True with probability `p`; consumes one random draw. */
  chance(p: number): boolean {
    return this.source.random() < p;
  }

  /** A level in percent scaled by the look's energy, rounded and kept in 0-100. */
  level(percent: number): number {
    return Math.round(clamp(percent * this.energy, 0, 100));
  }

  /** Writes values on fixtures; later writes win per attribute, as the build steps rely on. */
  set(ids: readonly number[], values: CueValueSource): void {
    buildCueVals(this.source.rig, [[ids, values]], this.vals, this.fns);
  }

  /** Every light except the LED screen, in rig order. */
  lightIds(): number[] {
    return this.source.rig.lightIds();
  }

  /**
   * The finished look as cue 1 of the auto executor. It keeps the `sec` field (quirk E7): the auto panel reads it, and
   * the save paths remove it before the cue reaches a show file.
   */
  toCue(): Cue {
    const name = `${this.style.name} · ${sectionName(this.section) || this.section}`;
    return { num: 1, name, fade: this.style.fade, vals: this.vals, fx: this.fx, sec: this.section };
  }
}
