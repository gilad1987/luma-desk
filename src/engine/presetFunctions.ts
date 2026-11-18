import { VENUE_AIM, type PresetAim } from './presetAim';
import { positionPresetsOf, type PresetFn } from './positionPresets';

function buildPresetFns(aim: PresetAim) {
  return {
    ...positionPresetsOf(aim),
    zMin: (f) => ({ zoom: f.T.zr[0] }),
    zMid: (f) => ({ zoom: (f.T.zr[0] + f.T.zr[1]) / 2 }),
    zMax: (f) => ({ zoom: f.T.zr[1] }),
  } satisfies Record<string, PresetFn>;
}

/** The name of a computed preset, as the `fn` field of a saved preset holds it. */
export type PresetFnName = keyof ReturnType<typeof buildPresetFns>;

/**
 * Every computed preset aimed at one stage, by the name a show file stores: the position presets plus the three zoom
 * presets, which depend on each fixture type's own zoom range. `presetFnsOf` resolves a stage frame into the `aim`.
 */
export function presetFnsAimedAt(aim: PresetAim): Readonly<Record<PresetFnName, PresetFn>> {
  return buildPresetFns(aim);
}

/** Every computed preset of the built-in stage, typed as uniform functions so callers always pass (f, k, n). */
export const PRESET_FNS: Readonly<Record<PresetFnName, PresetFn>> = presetFnsAimedAt(VENUE_AIM);
