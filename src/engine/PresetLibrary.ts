import type { AttrValues, Feature } from '../domain/attributes';
import { FEAT_ATTRS } from '../domain/attributes';
import type { EngineBus } from './events';
import type { PresetPools, PresetType } from './presetTypes';
import { PRESET_TYPES, PT_FEAT } from './presetTypes';
import { isPresetAvailable, PRESET_TARGETS, type PresetTarget } from './stage/presetTargets';
import type { RigSource } from './stage/RigSource';

/**
 * The show's preset pools. It owns the pools object so a loaded show or the demo can swap it whole, and so storing a
 * preset always announces the change to the pool view and to persistence. With a `RigSource` (the StageService) it
 * also knows which computed presets the current stage cannot aim (G10); without one every preset is available.
 */
export class PresetLibrary {
  #presets: PresetPools = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
  readonly #bus: EngineBus;
  readonly #source: RigSource | undefined;

  constructor(bus: EngineBus, source?: RigSource) {
    this.#bus = bus;
    this.#source = source;
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
   * The stage part (ring, screen, band) that the computed preset in `slot` needs and the current stage lacks (G10), so
   * applying it can refuse and name the part; null for any other slot, an empty one included. Its data stays, for a
   * later stage that has the part. The stage is read at call time, so no cache waits for `rigChanged`.
   */
  missingTarget(type: PresetType, slot: number): PresetTarget | null {
    const pr = this.#presets[type][slot];
    if (pr?.kind !== 'fn' || this.#source === undefined) return null;
    return isPresetAvailable(pr.fn, this.#source.frame) ? null : PRESET_TARGETS[pr.fn];
  }

  /** False when `missingTarget` names a part, so the pool view can hide the preset. */
  isAvailable(type: PresetType, slot: number): boolean {
    return this.missingTarget(type, slot) === null;
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
      name: old?.name && old.kind === 'fix' ? old.name : `${PRESET_TYPES[type]} ${slot}`,
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
