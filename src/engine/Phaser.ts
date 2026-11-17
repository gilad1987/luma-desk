import { shapePhaser, type FxSample } from './phaserShapes';
import type { FxRef } from './shared';

/** The two tempo values a phaser needs. The tempo owner satisfies it, so phasers do not depend on tap-tempo logic. */
export interface TempoReading {
  readonly bpm: number;
  /** The time in seconds, on the frame clock, that counts as beat zero. */
  readonly beatOrigin: number;
}

/**
 * Samples the phaser behind `ref` for one fixture at frame time `now` (seconds) into `out`. Phasers lock to the beat:
 * `rate` 1 is one cycle per bar of four beats, and `spread` offsets each fixture by its place in the instance's list.
 * The operation order is the original one, because output goldens compare bit for bit.
 */
export function evalPhaser(ref: FxRef, fixtureId: number, now: number, tempo: TempoReading, out: FxSample): void {
  const I = ref.inst;
  const freq = (tempo.bpm / 60 / 4) * I.rate;
  const tb = now - tempo.beatOrigin;
  const ph = (tb * freq + (I.spread / 360) * (ref.n > 1 ? ref.idx / ref.n : 0)) * Math.PI * 2;
  shapePhaser(I.type, I.size, { ph, tb, freq }, fixtureId, out);
}
