import type { Section } from '../../../autoshow/sections';
import type { Clock } from '../../../core';
import type { AppState } from '../../../engine/AppState';
import type { EngineBus } from '../../../engine/events';
import type { ExecutorPool } from '../../../engine/ExecutorPool';
import type { Programmer } from '../../../engine/Programmer';
import type { Tempo } from '../../../engine/Tempo';
import type { Modal, StoreModeGuard } from '../../shared';

/** The part of the Auto Show the cue HUD reports while it runs. */
export interface HudAutoShow {
  readonly on: boolean;
  readonly style: { readonly name: string };
  readonly section: Section | '';
  barsPerLook(): number;
}

/** What the executor strip, the master section and the cue HUD play, store into and read. */
export interface ExecutorsDeps {
  readonly bus: EngineBus;
  readonly state: AppState;
  readonly store: StoreModeGuard;
  readonly programmer: Programmer;
  readonly pool: ExecutorPool;
  readonly tempo: Tempo;
  readonly clock: Clock;
  readonly modal: Modal;
  readonly autoShow: HudAutoShow;
}

/** Where the panel renders: after `#tip` in the viewer (the HUD) and at the end of `#desk` (strip and master). */
export interface ExecutorsHosts {
  readonly viewerTip: HTMLElement;
  readonly desk: HTMLElement;
}
