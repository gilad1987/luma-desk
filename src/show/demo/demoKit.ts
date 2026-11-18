import type { AttrValues } from '../../domain/attributes';
import type { Rig } from '../../domain/rig';
import type { Cue, FixtureValues } from '../../engine/CueList';
import { colorByName } from '../../engine/colorByName';
import { buildCueVals, type CueValueStep } from '../../engine/cueValues';
import type { GroupPool } from '../../engine/GroupLibrary';
import type { PresetFn } from '../../engine/positionPresets';
import { PRESET_FNS, type PresetFnName } from '../../engine/presetFunctions';
import { PHASER_TYPES, type PhaserInstance, type PhaserType } from '../../engine/shared';

/** The vocabulary the demo cue files are written in, bound to one rig, its default groups and its presets. */
export interface DemoKit {
  /** The LED screens of the rig (none on a stage without one), as an id list like a group. */
  readonly screen: readonly number[];
  readonly rig: Rig;
  /** Cue values from steps; see `buildCueVals`. */
  readonly vals: (steps: readonly CueValueStep[]) => FixtureValues;
  /**
   * The ids of default group `slot`; the demo refers to groups by number, so the default order is fixed. A slot the
   * stage lacks gives no ids: the demo is written for the built-in stage, and on a custom stage its steps and phasers
   * on a missing group then set nothing while the rest of the cue (and the cue numbers the layers find) still loads.
   */
  readonly group: (slot: number) => number[];
  /** A named desk colour as r, g, b. */
  readonly color: (name: string) => AttrValues;
  /** A position preset with extra values on top (the extras win). */
  readonly aimed: (position: PresetFnName, extra: AttrValues) => PresetFn;
  /** A phaser with the type's default size, rate 1 and spread 360, then `options` over them. */
  readonly phaser: (type: PhaserType, ids: number[], options?: Partial<PhaserInstance>) => PhaserInstance;
  /** Adds values and phasers to cue `num` of `cues`, over what it already holds. */
  readonly layer: (cues: Cue[], num: number, steps: readonly CueValueStep[], fx?: PhaserInstance[]) => void;
}

/**
 * Builds the kit. `groups` must be the pool the show will hold: phasers share their id lists with the groups. `fns`
 * are the presets aimed at the stage of `rig` (`presetFnsOf`); the default is the built-in stage.
 */
export function createDemoKit(
  rig: Rig,
  groups: GroupPool,
  fns: Readonly<Record<PresetFnName, PresetFn>> = PRESET_FNS,
): DemoKit {
  return {
    screen: rig.fixtures.filter((f) => f.type === 'screen').map((f) => f.id),
    rig,
    vals: (steps) => buildCueVals(rig, steps, {}, fns),
    group: (slot) => groups[slot]?.ids ?? [],
    color: colorByName,
    aimed: (position, extra) => (f, k, n) => ({ ...fns[position](f, k, n), ...extra }),
    phaser: (type, ids, options = {}) => ({
      type,
      rate: 1,
      size: PHASER_TYPES[type].size,
      spread: 360,
      ids,
      ...options,
    }),
    layer: (cues, num, steps, fx = []) => {
      const cue = cues.find((c) => c.num === num);
      if (!cue) throw new Error(`Demo show: no cue ${num}`);
      buildCueVals(rig, steps, cue.vals, fns);
      cue.fx.push(...fx);
    },
  };
}
