import type { Rig } from '../../domain/rig';
import type { AppState } from '../../engine/AppState';
import type { EngineBus } from '../../engine/events';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import type { GroupLibrary } from '../../engine/GroupLibrary';
import type { PresetLibrary } from '../../engine/PresetLibrary';
import type { Programmer } from '../../engine/Programmer';
import type { Selection } from '../../engine/Selection';

/**
 * The engine owners a command line acts on. They are injected, not imported, so the command line never reaches the
 * UI (it reports only through `bus`) and tests run it on a real engine without a page.
 */
export interface CommandDeps {
  /** Resolves `Fixture a Thru b` and `All` to fixture ids. */
  readonly rig: Rig;
  readonly selection: Selection;
  readonly programmer: Programmer;
  readonly pool: ExecutorPool;
  /** The selected executor, store mode and the highlight/blackout switches. */
  readonly state: AppState;
  readonly groups: GroupLibrary;
  readonly presets: PresetLibrary;
  /** Feedback (`message`), repaint (`stateDirty`, `poolsChanged`) and save (`showChanged`) requests. */
  readonly bus: EngineBus;
}
