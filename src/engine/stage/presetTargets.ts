import type { StageFrame } from '../../domain/stage/StageFrame';
import type { PresetFnName } from '../presetFunctions';

/** A stage part that a position preset aims at and that a design may not have (G10). */
export type PresetTarget = 'ring' | 'screen' | 'band';

/**
 * The stage part each computed preset needs, or null when it aims only at the deck, the house or the fixture itself
 * and so works on every stage. A `Record` over every preset name, so a new preset cannot be added without a decision.
 */
export const PRESET_TARGETS: Readonly<Record<PresetFnName, PresetTarget | null>> = {
  ringDown: null,
  ringCone: 'ring',
  ringSun: 'ring',
  ringTwist: 'ring',
  ringCrown: 'ring',
  converge: null,
  wingFan: null,
  home: null,
  straight: null,
  center: null,
  singer: null,
  drums: 'band',
  down: null,
  audience: null,
  fanAud: null,
  crowd: null,
  skyFan: null,
  cross: null,
  screen: 'screen',
  vOut: null,
  band: 'band',
  orch: 'band',
  tunnel: null,
  zMin: null,
  zMid: null,
  zMax: null,
};

function hasTarget(target: PresetTarget, frame: StageFrame): boolean {
  switch (target) {
    case 'ring':
      return frame.ring !== null;
    case 'screen':
      return frame.screen !== null;
    case 'band':
      return frame.bandPoints.length > 0;
  }
}

/** True when the stage has what the preset aims at, so the pool can hide a preset that would aim at nothing. */
export function isPresetAvailable(name: PresetFnName, frame: StageFrame): boolean {
  const target = PRESET_TARGETS[name];
  return target === null || hasTarget(target, frame);
}
