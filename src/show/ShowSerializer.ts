import type { Rig } from '../domain/rig';
import type { AppState } from '../engine/AppState';
import { addNewDefaultGroups, defaultGroups } from '../engine/defaultGroups';
import { defaultPresets } from '../engine/defaultPresets';
import type { Executor } from '../engine/Executor';
import type { GroupLibrary } from '../engine/GroupLibrary';
import type { PresetLibrary } from '../engine/PresetLibrary';
import type { Programmer } from '../engine/Programmer';
import type { Selection } from '../engine/Selection';
import type { Tempo } from '../engine/Tempo';
import { savedPresets, withSavedPresets } from './savedPresets';
import { readShowFile } from './readShowFile';
import type { ShowFileV1 } from './ShowFile';
import { readStage, writeStage, type StageFieldDeps } from './stageField';

/** The engine state a show file captures, plus the programmer and selection that a load resets. */
export interface ShowSerializerDeps {
  /**
   * Read at each load after the stage is applied, so a getter over `StageService.rig` gives the default groups of the
   * rig the loaded show brings, not the rig of boot.
   */
  readonly rig: Rig;
  readonly groups: GroupLibrary;
  readonly presets: PresetLibrary;
  /** The ten playback executors; the auto-show executor is not part of a show. */
  readonly execs: readonly Executor[];
  readonly tempo: Tempo;
  readonly state: AppState;
  readonly programmer: Programmer;
  readonly selection: Selection;
  /** Saves and loads the `stage` key; without it the show file is exactly the one of older desks. */
  readonly stage?: StageFieldDeps;
}

/**
 * Converts between the engine and show file format v1. It touches no storage and no UI: the caller saves, and the
 * caller repaints after a load (haze slider, then pools), so the same loader serves boot, import and the demo.
 */
export class ShowSerializer {
  readonly #deps: ShowSerializerDeps;

  constructor(deps: ShowSerializerDeps) {
    this.#deps = deps;
  }

  /** The current show in format v1. It returns live engine objects, not copies; callers stringify it at once. */
  serialize(): ShowFileV1 {
    const { groups, presets, execs, tempo, state, stage } = this.#deps;
    return {
      v: 1,
      groups: groups.all,
      presets: savedPresets(presets.all),
      execs: execs.map((e) => ({ name: e.name, cues: e.cues, level: e.level })),
      bpm: tempo.bpm,
      haze: state.haze,
      ...(stage ? writeStage(stage) : {}),
    };
  }

  /**
   * Replaces the show with parsed show JSON, narrowed by `readShowFile`, keeping the original defaults rule by rule:
   * `bpm` 0 or missing becomes 120 while `haze` 0 stays 0; shows saved before the newer default groups get them only
   * in empty slots; missing or extra executors are ignored. It stops all executors and clears the programmer and the
   * selection. Bad data may throw part-way, as it always did; callers catch it. `readShowFile` runs first, so JSON
   * `null` throws before the stage changes; the stage loads next (`readStage`), so the groups below come from its rig.
   */
  load(data: unknown): void {
    const d = readShowFile(data);
    if (this.#deps.stage) readStage(data, this.#deps.stage);
    const { rig, groups, presets, execs, tempo, state, programmer, selection } = this.#deps;
    groups.replace(d.groups ? addNewDefaultGroups(d.groups, defaultGroups(rig)) : defaultGroups(rig));
    presets.replace(withSavedPresets(defaultPresets(), d.presets));
    execs.forEach((e, i) => {
      e.off();
      const x = (d.execs || [])[i] || {};
      e.name = x.name || '';
      e.cues = x.cues || [];
      e.level = x.level ?? 0;
      e.resetTracking();
    });
    tempo.setBpm(d.bpm || 120);
    state.haze = d.haze ?? 0.62;
    programmer.clear();
    selection.set([]);
  }
}
