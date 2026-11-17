import type { Clock } from '../../core';
import type { Rig } from '../../domain/rig';
import type { AppState } from '../AppState';
import type { EngineBus } from '../events';
import type { ExecutorPool } from '../ExecutorPool';
import type { PresetLibrary } from '../PresetLibrary';
import type { Selection } from '../Selection';

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
  /** CLEAR reads and writes the double-press time and the highlight switch here. */
  readonly state: AppState;
  /** Times the CLEAR double press; the original used `performance.now()`, not the frame time. */
  readonly clock: Clock;
  readonly bus: EngineBus;
}
