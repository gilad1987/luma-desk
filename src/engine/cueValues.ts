import { clamp } from '../core';
import type { AttrValues } from '../domain/attributes';
import type { Fixture } from '../domain/Fixture';
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

const resolve = (source: CueValueSource, f: Fixture, k: number, n: number): AttrValues => {
  if (typeof source === 'function') return source(f, k, n);
  if (typeof source === 'string') return PRESET_FNS[source](f, k, n);
  return source;
};

/**
 * Builds cue values from steps, as the demo show and the auto-show generate their cues. Later steps overwrite earlier
 * ones per attribute; a fixture keeps only the attributes its type has, and zoom is clamped into the type's range so a
 * generic "zoom 50" stays valid on every fixture. Ids the rig lacks are skipped. Pass `into` to add steps to values
 * already built: the auto-show writes one look in several passes.
 */
export function buildCueVals(rig: Rig, steps: readonly CueValueStep[], into: FixtureValues = {}): FixtureValues {
  for (const [ids, source] of steps)
    ids.forEach((id, k) => {
      const f = rig.get(id);
      if (!f) return;
      const out = (into[id] = into[id] || {});
      for (const [a, v] of attrEntries(resolve(source, f, k, ids.length)))
        if (f.has(a)) out[a] = a === 'zoom' ? clamp(v, f.T.zr[0], f.T.zr[1]) : v;
    });
  return into;
}
