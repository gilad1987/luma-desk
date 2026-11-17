import { POSITION_PRESETS } from './positionPresets';
import type { PresetFn } from './positionPresets';

/**
 * Every computed preset by the name a show file stores: the position presets plus the three zoom presets, which
 * depend on each fixture type's own zoom range.
 */
const presetFns = {
  ...POSITION_PRESETS,
  zMin: (f) => ({ zoom: f.T.zr[0] }),
  zMid: (f) => ({ zoom: (f.T.zr[0] + f.T.zr[1]) / 2 }),
  zMax: (f) => ({ zoom: f.T.zr[1] }),
} satisfies Record<string, PresetFn>;

/** The name of a computed preset, as the `fn` field of a saved preset holds it. */
export type PresetFnName = keyof typeof presetFns;

/** Every computed preset, typed as uniform functions so callers always pass (f, k, n). */
export const PRESET_FNS: Readonly<Record<PresetFnName, PresetFn>> = presetFns;
