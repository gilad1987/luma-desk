import type { WebGLRenderer } from 'three';
import { GpuStillWork } from '../GpuStillWork';
import type { StillOutput } from '../pngOutput';
import { saveRendererState } from '../rendererState';
import { StillController } from '../StillController';
import type { StillOptions } from '../stillOptions';
import type { StillResult, StillWork } from '../StillWork';
import type { TileRect } from '../tilePlan';
import { FakeStillSource } from './FakeStillSource';

/**
 * The real clock: `?test` freezes `performance.now` and `Date` for the baselines (index.html), but the method on
 * the prototype still reads real time. Budgets and timings need it.
 */
export const realNow = (): number => Performance.prototype.now.call(performance);

/** Wall-clock marks of one run, in ms from its start; the read-back marks wait for the GPU, so they are real. */
export interface RunTimes {
  firstStrip: number;
  strips: number;
  encoded: number;
  samples: number;
}

/** Wraps a work so the harness can time its phases without a hook in the production code. */
function timed(work: GpuStillWork, times: RunTimes): StillWork<StillOutput> {
  const start = realNow();
  const mark = (): number => realNow() - start;
  return {
    tiles: work.tiles,
    maxSamples: work.maxSamples,
    ready: () => work.ready(),
    prepare: () => work.prepare(),
    renderSample: (tile, sample) => (times.samples++, work.renderSample(tile, sample)),
    finishTile: (tile) => work.finishTile(tile),
    resolve: () => work.resolve(),
    readStrip: () => {
      const last = work.readStrip();
      if (times.firstStrip === 0) times.firstStrip = mark();
      if (last) times.strips = mark();
      return last;
    },
    encode: async () => {
      const output = await work.encode();
      times.encoded = mark();
      return output;
    },
    dispose: () => work.dispose(),
  };
}

/** One started run: its controller, its source and its timing marks. */
export interface HarnessRun {
  readonly controller: StillController<StillOutput>;
  readonly source: FakeStillSource;
  readonly times: RunTimes;
  readonly format: 'sum' | 'mean';
}

/** A controller over the fake source; `fast` runs on timers (the app's own frames take a second in SwiftShader). */
export function startRun(renderer: WebGLRenderer, options: StillOptions, fast: boolean): HarnessRun {
  const source = new FakeStillSource(renderer);
  const work = new GpuStillWork(renderer, source, options);
  const times: RunTimes = { firstStrip: 0, strips: 0, encoded: 0, samples: 0 };
  const saveState = (): (() => void) => saveRendererState(renderer, source.camera);
  const timers = {
    schedule: (step: () => void): number => window.setTimeout(step, 0),
    unschedule: (id: number): void => window.clearTimeout(id),
    budgetMs: 250,
  };
  const work2 = timed(work, times);
  const controller = new StillController({ work: work2, saveState, now: realNow, ...(fast ? timers : {}) });
  return { controller, source, times, format: work.format.mode };
}

export async function runToEnd(
  renderer: WebGLRenderer,
  options: StillOptions,
): Promise<{ output: StillOutput; times: RunTimes; format: 'sum' | 'mean' }> {
  const run = startRun(renderer, options, true);
  const result: StillResult<StillOutput> = await run.controller.start();
  if (result.state !== 'done') throw new Error(`the still render ended ${result.state}`);
  return { output: result.output, times: run.times, format: run.format };
}

/** The RGBA bytes of a rectangle of the (single) PNG, decoded by the browser as it would be opened. */
export async function decode(output: StillOutput, rect: TileRect): Promise<Uint8ClampedArray> {
  const [part] = output.parts;
  if (!part || output.parts.length !== 1) throw new Error('expected one PNG');
  const bitmap = await createImageBitmap(part.blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d');
  if (!context) throw new Error('no 2D canvas');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return context.getImageData(rect.x, rect.y, rect.width, rect.height).data;
}
