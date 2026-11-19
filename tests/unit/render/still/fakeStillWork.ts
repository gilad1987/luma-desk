import { StillController } from '../../../../src/render/still/StillController';
import { FakeFrames } from './fakeFrames';
import type { StillProgress, StillWork } from '../../../../src/render/still/StillWork';

/** A still work that logs its calls and spends `msPerStep` of fake time per step. */
export class FakeStillWork implements StillWork<string> {
  readonly calls: string[] = [];
  convergeAt = Infinity;
  failAt = '';
  disposed = 0;
  private strips = 0;

  readonly tiles: number;
  readonly maxSamples: number;
  private readonly frames: FakeFrames;
  private readonly msPerStep: number;
  private readonly stripCount = 2;

  constructor(tiles: number, maxSamples: number, frames: FakeFrames, msPerStep = 1) {
    this.tiles = tiles;
    this.maxSamples = maxSamples;
    this.frames = frames;
    this.msPerStep = msPerStep;
  }

  private log(call: string): void {
    this.frames.time += this.msPerStep;
    this.calls.push(call);
    if (call === this.failAt) throw new Error(`broke at ${call}`);
  }
  /** Not ready for the next `busyPolls` polls, as a GPU still working on a sample; a busy poll logs `busy`. */
  busyPolls = 0;
  ready(): boolean {
    if (this.busyPolls <= 0) return true;
    this.busyPolls--;
    this.calls.push('busy');
    return false;
  }
  prepare(): void {
    this.log('prepare');
  }
  renderSample(tile: number, sample: number): boolean {
    this.log(`sample ${tile}.${sample}`);
    return sample + 1 >= this.convergeAt;
  }
  finishTile(tile: number, samples: number): void {
    this.log(`tile ${tile} x${samples}`);
  }
  resolve(): void {
    this.log('resolve');
  }
  readStrip(): boolean {
    this.log(`strip ${this.strips}`);
    return ++this.strips >= this.stripCount;
  }
  encode(): Promise<string> {
    this.calls.push('encode');
    return this.failAt === 'encode' ? Promise.reject(new Error('no PNG')) : Promise.resolve('png');
  }
  dispose(): void {
    this.disposed++;
  }
}

/** A controller over a fake work and fake frames; it counts the state saves and restores. */
export function setup(tiles = 2, samples = 3, msPerStep = 1, budgetMs = 12) {
  const frames = new FakeFrames();
  const work = new FakeStillWork(tiles, samples, frames, msPerStep);
  const saved = { saves: 0, restores: 0 };
  const progress: StillProgress[] = [];
  const saveState = (): (() => void) => {
    saved.saves++;
    return () => saved.restores++;
  };
  const { schedule, unschedule, now } = frames;
  const deps = {
    work,
    saveState,
    schedule,
    unschedule,
    now,
    budgetMs,
    onProgress: (p: StillProgress) => progress.push(p),
  };
  return { frames, work, saved, progress, controller: new StillController(deps) };
}

export async function runAll(frames: FakeFrames): Promise<void> {
  while (frames.pending > 0) frames.runFrame();
  await Promise.resolve();
}
