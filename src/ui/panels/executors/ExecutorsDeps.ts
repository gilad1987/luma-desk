import type { AutoShow } from '../../../autoshow/AutoShow';
import type { Clock } from '../../../core';
import type { AppState } from '../../../engine/AppState';
import type { EngineBus } from '../../../engine/events';
import type { ExecutorPool } from '../../../engine/ExecutorPool';
import type { Programmer } from '../../../engine/Programmer';
import type { Tempo } from '../../../engine/Tempo';
import type { Modal, StoreModeGuard } from '../../shared';

/** The part of the Auto Show the cue HUD reports while it runs. */
export type HudAutoShow = Pick<AutoShow, 'on' | 'style' | 'section' | 'barsPerLook'>;

/** What the executor strip, the master section and the cue HUD play, store into and read. */
export interface ExecutorsDeps {
  readonly bus: EngineBus;
  readonly state: AppState;
  readonly store: StoreModeGuard;
  readonly programmer: Pick<Programmer, 'storeCue'>;
  readonly pool: Pick<ExecutorPool, 'execs' | 'go' | 'flashPress' | 'flashRelease' | 'setLevel'>;
  readonly tempo: Tempo;
  readonly clock: Clock;
  readonly modal: Pick<Modal, 'rename'>;
  readonly autoShow: HudAutoShow;
}

/** Where the panel renders: after `#tip` in the viewer (the HUD) and at the end of `#desk` (strip and master). */
export interface ExecutorsHosts {
  readonly viewerTip: HTMLElement;
  readonly desk: HTMLElement;
}
