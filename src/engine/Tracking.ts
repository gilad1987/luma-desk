import { ATTR } from '../domain/attributes';
import type { FixtureValues } from './CueList';
import type { Executor } from './Executor';
import { attrEntries, fxKey, indexFx, type FxIndex } from './shared';

/** What an executor shows at one cue once tracking is applied: the merged values and the phasers that still run. */
export interface TrackedState {
  readonly vals: FixtureValues;
  readonly fx: FxIndex;
}

/**
 * The tracked state of cue `i` of `e`: cues 0..i applied in order, where a later value for a feature also stops the
 * phaser an earlier cue ran on it. The result is memoised in `e.cache` until the executor is invalidated; renaming a
 * cue or changing its fade does not invalidate, which is harmless because neither changes the tracked state.
 */
export function tracked(e: Executor, i: number): TrackedState {
  const cached = e.cache[i];
  if (cached) return cached;
  const vals: FixtureValues = {},
    fx: FxIndex = {};
  for (let c = 0; c <= i; c++) {
    const cue = e.cues[c];
    if (!cue) continue;
    for (const [id, v] of Object.entries(cue.vals)) {
      vals[id] = Object.assign(vals[id] || {}, v);
      for (const [a] of attrEntries(v)) delete fx[fxKey(id, ATTR[a].feat)];
    }
    // saved shows are not validated, so a cue may lack its phaser list
    for (const inst of cue.fx || []) indexFx(fx, inst);
  }
  return (e.cache[i] = { vals, fx });
}
