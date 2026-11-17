import type { Tempo } from '../../engine/Tempo';

/** The read-only tempo values the venue animation needs; the engine `Tempo` satisfies it. */
export type BeatClock = Pick<Tempo, 'beatOrigin' | 'bpm'>;

/**
 * Beats since the beat origin at time `now` (ms). The crowd and the performers both derive their motion from it,
 * with the legacy operation order, so the float values match the pre-refactor frame loop.
 */
export function beatsElapsed(now: number, tempo: BeatClock): number {
  return ((now - tempo.beatOrigin) * tempo.bpm) / 60;
}
