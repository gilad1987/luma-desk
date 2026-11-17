import type { AttrValues } from '../domain/attributes';
import type { Fixture } from '../domain/Fixture';
import { PRESET_FNS } from './presetFunctions';
import type { Preset } from './presetTypes';

/**
 * The values preset `pr` gives fixture `f`, the `k`-th of `n` fixtures it is applied to, or undefined when a recorded
 * preset has nothing for that fixture. A `global` preset returns its own `vals` object, not a copy.
 */
export function presetValues(pr: Preset, f: Fixture, k: number, n: number): AttrValues | undefined {
  if (pr.kind === 'global') return pr.vals;
  if (pr.kind === 'fn') return PRESET_FNS[pr.fn](f, k, n);
  // a hand-edited show file can carry a preset without `fix`; it then applies nothing instead of throwing
  return pr.fix?.[f.id];
}
