import type { AttrValues, Feature } from '../domain/attributes';
import type { PresetFnName } from './presetFunctions';

/** The preset pools by number, as the command line names them (`Preset 4.12` is Color slot 12). */
export type PresetType = 1 | 2 | 3 | 4 | 5;

/**
 * One stored look. `global` sets the same values on every fixture; `fn` computes them per fixture; `fix` holds
 * recorded values per fixture id. Key order is part of the saved show file, so object literals keep it.
 */
export type Preset =
  | { name: string; kind: 'global'; vals: AttrValues; gobo?: number }
  | { name: string; kind: 'fn'; fn: PresetFnName }
  | { name: string; kind: 'fix'; fix: Record<number, AttrValues> };

/** The five preset pools, each by slot number (1-based); an empty slot has no key. */
export type PresetPools = Record<PresetType, Record<number, Preset>>;

/** The pool names, used in pool tabs, default preset names and store feedback. */
export const PRESET_TYPES: Readonly<Record<PresetType, string>> = {
  1: 'Dimmer',
  2: 'Position',
  3: 'Gobo',
  4: 'Color',
  5: 'Beam',
};

/** The features a preset of each pool records; storing a Color preset keeps only r, g and b from the programmer. */
export const PT_FEAT: Readonly<Record<PresetType, readonly Feature[]>> = {
  1: ['dim'],
  2: ['pos'],
  3: ['gobo'],
  4: ['color'],
  5: ['beam'],
};
