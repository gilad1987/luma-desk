import type { PresetLibrary } from '../../engine/PresetLibrary';
import type { PresetType } from '../../engine/presetTypes';

/** Whether `type` names a preset pool of `presets`, the original's `presets[a]` truthiness test. */
export function isPresetType(presets: PresetLibrary, type: number): type is PresetType {
  return Object.hasOwn(presets.all, type);
}
