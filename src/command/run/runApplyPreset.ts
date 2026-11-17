import { CommandError } from '../CommandError';
import type { StatementOf } from '../statements';
import type { CommandDeps } from './CommandDeps';
import { isPresetType } from './isPresetType';

/** Applies preset `type.slot` to the selection through the programmer; an empty slot is an error. */
export function runApplyPreset({ ref }: StatementOf<'applyPreset'>, { presets, programmer }: CommandDeps): void {
  if (!isPresetType(presets, ref.type) || !presets.all[ref.type][ref.slot]) throw new CommandError('Preset not found');
  programmer.applyPreset(ref.type, ref.slot);
}
