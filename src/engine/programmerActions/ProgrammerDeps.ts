import type { Clock } from '../../core';
import type { Rig } from '../../domain/rig';
import type { AppState } from '../AppState';
import type { EngineBus } from '../events';
import type { ExecutorPool } from '../ExecutorPool';
import type { PresetLibrary } from '../PresetLibrary';
import type { Selection } from '../Selection';
import type { RigSource } from '../stage/RigSource';

/**
 * The owners the programmer works with. They are injected, not imported, so tests build a programmer on any rig and
 * clock, and so the programmer never reaches the UI: it reports only through `bus`.
 */
export interface ProgrammerDeps {
  readonly rig: Rig;
  /** Most operations act on the selected fixtures, in selection order. */
  readonly selection: Selection;
  readonly presets: PresetLibrary;
  /** Store Cue records into these executors. */
  readonly pool: ExecutorPool;
  /** CLEAR turns the highlight switch off here. */
  readonly state: AppState;
  /** Times the CLEAR double press; the original used `performance.now()`, not the frame time. */
  readonly clock: Clock;
  readonly bus: EngineBus;
  /** The stage the computed presets aim at, read at apply time; without it they aim at the built-in stage. */
  readonly source?: RigSource;
}
