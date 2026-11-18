import { clamp, jsonClone, lerp } from '../core';
import type { AttrName, AttrValues } from '../domain/attributes';
import type { FixtureValues } from './CueList';
import type { Executor } from './Executor';
import { attrName } from './shared';

/** A running crossfade of one executor from the values it showed to a cue's tracked values. */
export interface Fade {
  /** A copy of the executor values when the fade started. */
  from: FixtureValues;
  /** The cue's tracked values, shared with the tracking cache, never mutated. */
  to: FixtureValues;
  /** Start time in seconds on the executor clock, moved forward on resume so the fade continues where it stopped. */
  t0: number;
  /** Duration in seconds; zero or less jumps to the target on the next step. */
  dur: number;
  paused: boolean;
  /** Seconds already faded when paused; set by every pause. */
  pausedAt?: number;
}

/**
 * Advances the fade of `e` to frame time `now` (seconds) and writes the blend into `e.vals`. The curve is smoothstep.
 * A missing dimmer counts as 0; any other attribute missing on the target holds its old value until the fade ends,
 * and gobo snaps at the half-way point because gobo slots cannot blend.
 */
export function stepFade(e: Executor, now: number): void {
  const F = e.fade;
  if (!F || F.paused) return;
  const p = F.dur > 0 ? clamp((now - F.t0) / F.dur, 0, 1) : 1,
    k = p * p * (3 - 2 * p);
  if (p >= 1) {
    e.vals = jsonClone(F.to);
    e.fade = null;
    return;
  }
  const v: FixtureValues = {};
  const ids = new Set([...Object.keys(F.from), ...Object.keys(F.to)]);
  for (const id of ids) v[id] = blendFixture(F.from[id] || {}, F.to[id] || {}, k);
  e.vals = v;
}

/** One fixture's blend at curve position `k` (always below 1 here: the caller ends the fade at 1). */
function blendFixture(a: AttrValues, b: AttrValues, k: number): AttrValues {
  const o: AttrValues = {};
  // the keys of a, then those only in b: the order of the original key Set, without its arrays on every frame
  for (const key in a) blendAttr(o, attrName(key), a, b, k);
  for (const key in b) if (!Object.hasOwn(a, key)) blendAttr(o, attrName(key), a, b, k);
  return o;
}

/** Writes the blend of attribute `at` into `o`; see {@link stepFade} for the rules. */
// eslint-disable-next-line @typescript-eslint/max-params -- per-frame path: an options object would allocate per call
function blendAttr(o: AttrValues, at: AttrName, a: AttrValues, b: AttrValues, k: number): void {
  const fa = a[at],
    fb = b[at];
  if (at === 'dim') {
    o[at] = lerp(fa ?? 0, fb ?? 0, k); // quirk A4 (orig:1655): a missing dimmer fades from or to 0
    return;
  }
  if (fb == null) {
    // quirk A3 (orig:1656): k < 1 is always true here
    if (k < 1) o[at] = fa ?? fb;
    return;
  }
  const from = fa ?? fb;
  // quirk A4 (orig:1657): gobo is a slot number, so it snaps half way through the fade instead of blending
  if (at === 'gobo') o[at] = k < 0.5 ? from : fb;
  else o[at] = lerp(from, fb, k);
}
