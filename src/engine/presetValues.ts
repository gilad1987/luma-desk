import type { AttrValues } from '../domain/attributes';
import type { Fixture } from '../domain/Fixture';
import type { PresetFns } from './presetFunctions';
import type { Preset } from './presetTypes';

/**
 * The values preset `pr` gives fixture `f`, the `at.k`-th (0-based) of the `at.n` fixtures it is applied to, or
 * undefined when a recorded preset has nothing for that fixture. A `global` preset returns its own `vals` object, not
 * a copy. A computed preset looks its name up in `fns`, the table of the current stage (`PresetLibrary.fns`); it has no
 * default, so no caller can aim at the built-in stage by mistake.
 */
export function presetValues(
  pr: Preset,
  f: Fixture,
  at: { readonly k: number; readonly n: number },
  fns: PresetFns,
): AttrValues | undefined {
  if (pr.kind === 'global') return pr.vals;
  if (pr.kind === 'fn') return fns[pr.fn](f, at.k, at.n);
  // a hand-edited show file can carry a preset without `fix`; it then applies nothing instead of throwing
  return pr.fix?.[f.id];
}
