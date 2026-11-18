import { clamp } from '../core';
import type { AttrValues } from '../domain/attributes';
import type { Rig } from '../domain/rig';
import type { FixtureValues } from './CueList';
import type { PresetFn } from './positionPresets';
import { PRESET_FNS } from './presetFunctions';
import type { PresetFnName } from './presetFunctions';
import { attrEntries } from './shared';

/**
 * What a cue-building step sets on each fixture: the same values for all, the name of a computed preset, or a
 * function of the fixture and its place `k` among the `n` fixtures of the step.
 */
export type CueValueSource = AttrValues | PresetFnName | PresetFn;

/** One cue-building step: the fixture ids and what to set on them. */
export type CueValueStep = readonly [ids: readonly number[], source: CueValueSource];

/** The step's source as a function of the fixture, with a preset name looked up in `fns`, or its fixed values. */
const resolve = (source: CueValueSource, fns: Readonly<Record<PresetFnName, PresetFn>>): PresetFn | AttrValues =>
  typeof source === 'string' ? fns[source] : source;

/**
 * Builds cue values from steps, as the demo show and the auto-show generate their cues. Later steps overwrite earlier
 * ones per attribute; a fixture keeps only the attributes its type has, and zoom is clamped into the type's range so a
 * generic "zoom 50" stays valid on every fixture. Ids the rig lacks are skipped. Pass `into` to add steps to values
 * already built: the auto-show writes one look in several passes. Pass `fns` (`presetFnsOf(frame)`) to aim the named
 * presets at another stage than the built-in one.
 */
export function buildCueVals(
  rig: Rig,
  steps: readonly CueValueStep[],
  into: FixtureValues = {},
  fns: Readonly<Record<PresetFnName, PresetFn>> = PRESET_FNS,
): FixtureValues {
  for (const [ids, source] of steps) {
    const step = resolve(source, fns);
    ids.forEach((id, k) => {
      const f = rig.get(id);
      if (!f) return;
      const out = (into[id] = into[id] || {});
      const values = typeof step === 'function' ? step(f, k, ids.length) : step;
      for (const [a, v] of attrEntries(values))
        if (f.has(a)) out[a] = a === 'zoom' ? clamp(v, f.T.zr[0], f.T.zr[1]) : v;
    });
  }
  return into;
}
