import type { Preset, PresetPools } from '../engine/presetTypes';
import type { SavedPreset } from './ShowFile';

const isSaved = (entry: [string, Preset]): entry is [string, SavedPreset] => entry[1].kind !== 'fn';

/** The preset pools without computed presets, every pool key kept even when it ends up empty (format v1). */
export function savedPresets(pools: PresetPools): Record<string, Record<string, SavedPreset>> {
  return Object.fromEntries(
    Object.entries(pools).map(([type, slots]) => [type, Object.fromEntries(Object.entries(slots).filter(isSaved))]),
  );
}

/**
 * Writes the saved presets over the defaults slot by slot, so computed presets come back from the defaults and saved
 * ones win. A pool number the desk does not have throws as the original did (the caller reports a bad show), but only
 * when that pool has a slot.
 */
export function withSavedPresets(
  defaults: PresetPools,
  saved: Record<string, Record<string, Preset>> | undefined,
): PresetPools {
  const pools = defaults as Record<string, Record<string, Preset> | undefined>;
  for (const [type, slots] of Object.entries(saved || {}))
    for (const [slot, preset] of Object.entries(slots ?? {})) {
      const pool = pools[type];
      if (!pool) throw new TypeError(`Unknown preset pool ${type}`);
      pool[slot] = preset;
    }
  return defaults;
}
