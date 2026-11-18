import type { Rig } from '../../domain/rig';
import type { AppState } from '../../engine/AppState';
import type { EngineBus } from '../../engine/events';
import type { Executor } from '../../engine/Executor';
import type { GroupLibrary } from '../../engine/GroupLibrary';
import type { PresetLibrary } from '../../engine/PresetLibrary';
import type { Programmer } from '../../engine/Programmer';
import type { Selection } from '../../engine/Selection';
import type { Tempo } from '../../engine/Tempo';
import { DemoShow, GuideFlag, type KeyValueStore, LayoutPrefs, ShowSerializer, ShowStorage } from '../../show';

/** The engine parts a show file holds, named as the composition root names them. */
export interface ShowFilesDeps {
  readonly rig: Rig;
  readonly groupLibrary: GroupLibrary;
  readonly presetLibrary: PresetLibrary;
  /** The ten playback executors (`pool.execs`); the auto executor is not part of a show. */
  readonly execs: readonly Executor[];
  readonly tempo: Tempo;
  readonly appState: AppState;
  readonly programmer: Programmer;
  readonly selection: Selection;
  readonly bus: EngineBus;
}

/** The show persistence objects the dialog, the boot restore, the layout and the guide share. */
export interface ShowFiles {
  readonly serializer: ShowSerializer;
  readonly showStorage: ShowStorage;
  readonly demo: DemoShow;
  readonly layoutPrefs: LayoutPrefs;
  readonly guideFlag: GuideFlag;
}

/**
 * `localStorage` behind the store boundary. It is read on each call, not captured at boot, as the original wrapper
 * did: a browser that blocks storage fails only the save or load that touches it, never the boot.
 */
const browserStore: KeyValueStore = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
};

/**
 * Builds the show serializer, its delayed browser save (started by every `showChanged`), the demo show and the two
 * small stored flags. None of them touches the DOM, three.js or `Math.random` when built, so the root can build them
 * before the UI that uses them.
 */
export function createShowFiles(deps: ShowFilesDeps): ShowFiles {
  const { rig, execs, tempo, programmer, selection, bus } = deps;
  const serializer = new ShowSerializer({
    rig,
    groups: deps.groupLibrary,
    presets: deps.presetLibrary,
    execs,
    tempo,
    state: deps.appState,
    programmer,
    selection,
  });
  const showStorage = new ShowStorage(browserStore, () => serializer.serialize());
  // every show edit reports `showChanged`; the delayed browser save is its one listener
  bus.on('showChanged', () => showStorage.persist());
  return {
    serializer,
    showStorage,
    demo: new DemoShow({ rig, serializer, execs, state: deps.appState, bus }),
    layoutPrefs: new LayoutPrefs(browserStore),
    guideFlag: new GuideFlag(browserStore),
  };
}
