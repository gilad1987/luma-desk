import type { Rig } from '../domain/rig';
import type { ExecutorPool } from './ExecutorPool';
import {
  applyMasters,
  applyPhasers,
  mergeExecutors,
  mergeProgrammer,
  resetOutput,
  type MasterState,
  type ProgrammerOutput,
  type SelectedFixtures,
} from './output';
import type { TempoReading } from './Phaser';
import type { FxSample } from './phaserShapes';

/**
 * The auto-show's per-frame influence on the output. The engine takes it as data so it never depends on the
 * auto-show; pass `{ pump: 1, hitUntil: 0 }` when no auto-show runs.
 */
export interface OutputModulation {
  /** Factor on the auto executor's level for beams and spots (the beat pump). */
  readonly pump: number;
  /** Frame time in seconds until which blinders flash with the auto executor (a look-change hit). */
  readonly hitUntil: number;
}

/** Everything the merge reads each frame; each owner is read live, never copied. */
export interface OutputSources {
  readonly rig: Rig;
  readonly pool: ExecutorPool;
  readonly programmer: ProgrammerOutput;
  readonly master: MasterState;
  readonly selection: SelectedFixtures;
  readonly tempo: TempoReading;
}

/**
 * Computes every fixture's output for one frame, in rig build order, and writes it in place into `fixture.out` (and
 * `fixture.base`, the look before phasers). Layers apply in a fixed order: executors, auto-show hit, programmer,
 * phasers, masters.
 */
export class OutputMerger {
  private readonly sources: OutputSources;
  private readonly sample: FxSample = { dp: 0, dt: 0, dim: 0, r: 0, g: 0, b: 0 };

  constructor(sources: OutputSources) {
    this.sources = sources;
  }

  /** Merges the frame at render-loop time `now` (seconds). */
  compute(now: number, modulation: OutputModulation): void {
    const { rig, pool, programmer, master, selection, tempo } = this.sources;
    const active = pool.all.filter((e) => e.on && (e.level > 0 || e.flash)).sort((a, b) => a.lastGo - b.lastGo);
    const auto = pool.autoExec;
    for (const f of rig.fixtures) {
      const o = resetOutput(f);
      const slots = mergeExecutors(f, o, active, modulation.pump);
      if (f.type === 'blinder' && modulation.hitUntil > now && auto.on) o.dim = Math.max(o.dim, 100 * auto.level);
      mergeProgrammer(f, o, slots, programmer);
      Object.assign(f.base, o);
      applyPhasers(f, o, slots, now, tempo, this.sample);
      applyMasters(f, o, master, selection);
    }
  }
}
