import type { Clock } from '../../core';
import type { AppState } from '../../engine/AppState';
import type { EngineBus } from '../../engine/events';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import type { Programmer } from '../../engine/Programmer';
import type { Selection } from '../../engine/Selection';
import type { Tempo } from '../../engine/Tempo';
import type { HudAutoShow } from '../../ui/panels/executors/ExecutorsDeps';
import { ExecutorsPanel } from '../../ui/panels/executors/ExecutorsPanel';
import { SelectionInfo } from '../../ui/panels/selection/SelectionInfo';
import type { UiServices } from './createUiServices';

/** What the playback readouts need; the field names are the main.ts variables they replace. */
export interface ExecutorsWiringDeps extends UiServices {
  /** `#tip` in the viewer: the cue HUD renders right after it. */
  readonly viewerTip: HTMLElement;
  /** `#desk`: the executor strip and the master section render at its end. */
  readonly desk: HTMLElement;
  readonly bus: EngineBus;
  readonly appState: AppState;
  readonly programmer: Programmer;
  readonly selection: Selection;
  readonly pool: Pick<ExecutorPool, 'execs' | 'go' | 'flashPress' | 'flashRelease' | 'setLevel'>;
  readonly tempo: Tempo;
  readonly clock: Clock;
  readonly autoShow: HudAutoShow;
}

/** The fast-tick readouts over the viewer and on the desk. */
export interface ExecutorsWiring {
  /** Executor strip, master section (GO, PAUSE, blackout, tap, Grand Master) and the cue HUD. */
  readonly executors: ExecutorsPanel;
  /** The selection and programmer chips in `#vhud`. */
  readonly selectionInfo: SelectionInfo;
}

/**
 * Builds the executor cards (the old `buildExecs`), the master keys with the GM fader, and the selection chips. Call it
 * after `wireEncoders` and before `LayoutManager.apply`: the layouts move `#execs` and `#master`, which this renders.
 * On the fast tick register `executors.fast` first and `selectionInfo.fast` after the auto-show and MA readouts.
 */
export function wireExecutors(deps: ExecutorsWiringDeps): ExecutorsWiring {
  const executors = new ExecutorsPanel(
    { viewerTip: deps.viewerTip, desk: deps.desk },
    {
      bus: deps.bus,
      state: deps.appState,
      store: deps.store,
      programmer: deps.programmer,
      pool: deps.pool,
      tempo: deps.tempo,
      clock: deps.clock,
      modal: deps.modal,
      autoShow: deps.autoShow,
    },
  );
  return { executors, selectionInfo: new SelectionInfo(deps.selection, deps.programmer) };
}
