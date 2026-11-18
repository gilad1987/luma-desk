import type { AttrValues, Feature } from '../domain/attributes';
import { FEAT_ATTRS } from '../domain/attributes';
import type { EngineBus } from './events';
import type { PresetPools, PresetType } from './presetTypes';
import { PRESET_TYPES, PT_FEAT } from './presetTypes';

/**
 * The show's preset pools. It owns the pools object so a loaded show or the demo can swap it whole, and so storing a
 * preset always announces the change to the pool view and to persistence.
 */
export class PresetLibrary {
  #presets: PresetPools = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
  readonly #bus: EngineBus;

  constructor(bus: EngineBus) {
    this.#bus = bus;
  }

  /** The live pools. Show save, the pool view and the command line read them. */
  get all(): PresetPools {
    return this.#presets;
  }

  /**
   * Swaps in whole pools (loaded show, demo, defaults). It announces nothing: the loader repaints and saves once,
   * after it has also replaced the groups.
   */
  replace(presets: PresetPools): void {
    this.#presets = presets;
  }

  /**
   * Records the programmer values of the pool's features for `ids` (the selection) as a per-fixture preset in
   * `slot`. Storing over a recorded preset keeps its name; anything else gets the default name. When no selected
   * fixture has such a value, nothing is stored and the error is reported.
   */
  storeFromProgrammer(type: PresetType, slot: number, ids: readonly number[], vals: Record<number, AttrValues>): void {
    const feats = PT_FEAT[type],
      fix: Record<number, AttrValues> = {};
    for (const id of ids) {
      const v = vals[id];
      if (!v) continue;
      const o = featureValues(v, feats);
      if (Object.keys(o).length) fix[id] = o;
    }
    if (!Object.keys(fix).length) {
      const text = `Store Preset: no ${PRESET_TYPES[type]} values in programmer for selection`;
      this.#bus.emit('message', { kind: 'log', text, level: 'er' });
      return;
    }
    const pool = this.#presets[type],
      old = pool[slot];
    pool[slot] = {
      name: old?.name && old.kind === 'fix' ? old.name : `${PRESET_TYPES[type]} ${slot}`, // quirk B5 (orig:1876)
      kind: 'fix',
      fix,
    };
    this.#bus.emit('message', { kind: 'log', text: `Stored Preset ${type}.${slot}`, level: 'ok' });
    this.#bus.emit('poolsChanged', undefined);
    this.#bus.emit('showChanged', undefined);
  }
}

/** The values of `v` that belong to `feats`, in feature order; unset and null values are left out. */
function featureValues(v: AttrValues, feats: readonly Feature[]): AttrValues {
  const o: AttrValues = {};
  for (const ft of feats) for (const a of FEAT_ATTRS[ft]) if (v[a] != null) o[a] = v[a];
  return o;
}
