import type { AppState } from '../../engine/AppState';
import type { EngineBus, EngineMessage } from '../../engine/events';
import type { Executor } from '../../engine/Executor';
import type { GroupLibrary } from '../../engine/GroupLibrary';
import type { PresetLibrary } from '../../engine/PresetLibrary';
import type { Programmer } from '../../engine/Programmer';
import type { Selection } from '../../engine/Selection';
import type { StageService } from '../../engine/stage/StageService';
import type { Tempo } from '../../engine/Tempo';
import { he } from '../../i18n/he';
import { DemoShow, GuideFlag, LayoutPrefs, ShowSerializer, ShowStorage } from '../../show';
import { browserStore, withLiveRig } from '../shared';

/** The engine parts a show file holds, named as the composition root names them. */
export interface ShowFilesDeps {
  /** The stage: a show saves a custom design and a load applies the show's design first. */
  readonly stage: StageService;
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
 * Builds the show serializer, its delayed browser save (started by every `showChanged`), the demo show and the two
 * small stored flags. None of them touches the DOM, three.js or `Math.random` when built, so the root can build them
 * before the UI that uses them. The serializer and the demo read the rig from the stage at each call.
 */
export function createShowFiles(deps: ShowFilesDeps): ShowFiles {
  const { stage, execs, tempo, programmer, selection, bus } = deps;
  const serializer = new ShowSerializer(
    withLiveRig(stage, {
      groups: deps.groupLibrary,
      presets: deps.presetLibrary,
      execs,
      tempo,
      state: deps.appState,
      programmer,
      selection,
      stage: {
        service: stage,
        badStage: he.builder.badStage,
        toast: (message: EngineMessage) => bus.emit('message', message),
      },
    }),
  );
  const showStorage = new ShowStorage(browserStore, () => serializer.serialize());
  // every show edit reports `showChanged`; the delayed browser save is its one listener
  bus.on('showChanged', () => showStorage.persist());
  const demo = new DemoShow(withLiveRig(stage, { source: stage, serializer, execs, state: deps.appState, bus }));
  return {
    serializer,
    showStorage,
    demo,
    layoutPrefs: new LayoutPrefs(browserStore),
    guideFlag: new GuideFlag(browserStore),
  };
}
