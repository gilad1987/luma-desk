import type { Clock, EventBus } from '../core';
import type { EngineEvents } from '../engine/events';
import type { ExecutorPool } from '../engine/ExecutorPool';
import type { Programmer } from '../engine/Programmer';
import type { Tempo } from '../engine/Tempo';
import type { LookGenerator } from './LookGenerator';

/** What the auto-show drives and reads. `bassLevel` returns null while no song analyser exists. */
export interface AutoShowDeps {
  readonly pool: ExecutorPool;
  readonly programmer: Pick<Programmer, 'hasContent'>;
  readonly tempo: Tempo;
  readonly clock: Clock;
  readonly looks: LookGenerator;
  readonly bus: EventBus<EngineEvents>;
  readonly bassLevel: () => number | null;
  /** Called after start and stop, so the auto panel can repaint its button. */
  readonly onChange: () => void;
}
