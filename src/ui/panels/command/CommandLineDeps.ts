import type { AppState } from '../../../engine/AppState';
import type { EngineBus } from '../../../engine/events';
import type { Executor } from '../../../engine/Executor';
import type { ExecutorPool } from '../../../engine/ExecutorPool';
import type { Programmer } from '../../../engine/Programmer';
import type { Selection } from '../../../engine/Selection';
import type { Modal, StoreModeGuard } from '../../shared';

/** What the command line, its keys and the page keyboard act on. */
export interface CommandLineDeps {
  readonly bus: EngineBus;
  readonly state: AppState;
  readonly store: StoreModeGuard;
  readonly programmer: Pick<Programmer, 'clearPress'>;
  readonly selection: Pick<Selection, 'ids' | 'set' | 'reverse'>;
  readonly pool: Pick<ExecutorPool, 'go'>;
  readonly execs: readonly Executor[];
  readonly modal: Modal;
  /** Parses and runs one command line (the `CommandRunner`). */
  readonly runCommand: (raw: string) => void;
  /** Every light fixture id (not the screens): what ALL selects. */
  readonly lightIds: () => number[];
  /** FAN changed: the encoders repaint their Fan button when the Position feature shows (quirk Q9, orig:2238). */
  readonly fanToggled: () => void;
  /** The guide or the tour covers the page: page keys do nothing then. */
  readonly guideOrTourOpen: () => boolean;
  /** The Stage Builder covers the desk: page keys do nothing then, so Space cannot fire GO+ on a hidden executor. */
  readonly builderOpen: () => boolean;
}
