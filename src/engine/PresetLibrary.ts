import type { AttrValues } from '../domain/attributes';
import type { EngineBus } from './events';
import { featureValues } from './featureValues';
import { PRESET_FNS, type PresetFns } from './presetFunctions';
import type { PresetPools, PresetType } from './presetTypes';
import { PRESET_TYPES, PT_FEAT } from './presetTypes';
import { presetFnsOf } from './stage/presetFnsOf';
import { isPresetAvailable, PRESET_TARGETS, type PresetTarget } from './stage/presetTargets';
import type { RigSource } from './stage/RigSource';

/**
 * The show's preset pools. It owns the pools object so a loaded show or the demo can swap it whole, and so storing a
 * preset always announces the change to the pool view and to persistence. With a `RigSource` (the StageService) it
 * knows which computed presets the current stage cannot aim (G10) and aims the others at it through `presetFnsOf`, the
 * one place that turns a stage frame into presets. Without one every preset is available and aims at the built-in
 * stage.
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

  /**
   * The computed presets aimed at the current stage, read at call time like `missingTarget`. It builds a new table on
   * each read, so a caller reads it once per apply, not once per fixture.
   */
  get fns(): PresetFns {
    return this.#source === undefined ? PRESET_FNS : presetFnsOf(this.#source.frame);
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
