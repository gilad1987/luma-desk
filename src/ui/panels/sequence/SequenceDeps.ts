import type { AppState } from '../../../engine/AppState';
import type { EngineBus } from '../../../engine/events';
import type { Executor } from '../../../engine/Executor';
import type { ExecutorPool } from '../../../engine/ExecutorPool';
import type { Programmer } from '../../../engine/Programmer';
import type { Modal, StoreModeGuard } from '../../shared';
import type { SideTab } from '../side/sideTabsMarkup';

/** What the Sequence pane edits and plays: the executors, the selected one, and the command line for deletes. */
export interface SequenceDeps {
  readonly bus: EngineBus;
  readonly state: AppState;
  readonly execs: readonly Executor[];
  readonly pool: Pick<ExecutorPool, 'go'>;
  readonly programmer: Pick<Programmer, 'storeCue'>;
  readonly store: StoreModeGuard;
  readonly modal: Pick<Modal, 'rename' | 'number'>;
  /** Runs a command line exactly as typed, so a delete gives the same feedback as `Delete Cue n`. */
  readonly runCommand: (raw: string) => void;
  /** The visible side pane; the table repaints only while it is the sequence. */
  readonly sideTab: () => SideTab;
}
