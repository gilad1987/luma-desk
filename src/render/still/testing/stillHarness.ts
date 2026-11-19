import { WebGLRenderer } from 'three';
import { gaussianJitter } from '../jitter';
import type { StillOutput } from '../pngOutput';
import { STILL_PRESETS, type StillPreset } from '../stopRule';
import type { StillResult, StillState } from '../StillWork';
import { measure, meanErrors, rendererSnapshot, seamCheck } from './harnessChecks';
import type { Measurement, RendererSnapshot, SeamResult } from './harnessChecks';
import { decode, realNow, runToEnd, startRun, type HarnessRun } from './harnessRun';

/** The fake's G at a pixel centre moved by each jitter, averaged: what the accumulated G must equal. */
function jitterCheckerMean(samples: number): number {
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const [x, y] = gaussianJitter(i);
    sum += (Math.floor(2 * (0.5 + x)) + Math.floor(2 * (0.5 + y)) + 8) % 2;
  }
  return sum / samples;
}

/** What `window.__deskStill()` gives a spec; every method returns plain JSON. */
export interface StillHarness {
  snapshot(): RendererSnapshot;
  /**
   * Mean error per channel (8-bit steps) at a one-tile size. G is compared with the checker's mean over the jitter
   * points the render used (exact for the pipeline); `checkerMean` is that mean, whose distance from 0.5 is the
   * sampling error of the filter itself.
   */
  converge(quality: StillPreset): Promise<{ format: 'sum' | 'mean'; errors: number[]; checkerMean: number }>;
  seam(): Promise<SeamResult>;
  /** Starts a render on the page's animation frames; the spec steps the frames, then calls `cancel`. */
  begin(): void;
  /** Cancels the begun render and times how long until its promise settles. */
  cancel(): Promise<{ ms: number; state: StillState; reason: string; sourceDisposed: boolean }>;
  measure(width: number, height: number): Promise<Measurement>;
}

/**
 * The still render's e2e harness over the page's own renderer and `FakeStillSource`, reached through the test hook.
 * The module loads only when a spec calls `window.__deskStill()`, so nothing of it exists at boot.
 */
export function createStillHarness(renderer: unknown): StillHarness {
  if (!(renderer instanceof WebGLRenderer)) throw new Error('the still harness needs the WebGL renderer');
  let run: HarnessRun | null = null;
  let result: Promise<StillResult<StillOutput>> | null = null;
  return {
    snapshot: () => rendererSnapshot(renderer),
    converge: async (quality) => {
      const [width, height] = [480, 270];
      const { output, format } = await runToEnd(renderer, { width, height, quality });
      const pixels = await decode(output, { index: 0, x: 0, y: 0, width, height, glY: 0 });
      const checkerMean = jitterCheckerMean(STILL_PRESETS[quality]);
      return { format, errors: meanErrors(pixels, width, checkerMean * 255), checkerMean };
    },
    seam: () => seamCheck(renderer),
    begin: () => {
      run = startRun(renderer, { width: 1920, height: 1080, quality: 'max' }, false);
      result = run.controller.start();
    },
    cancel: async () => {
      if (!run || !result) throw new Error('call begin first');
      const seen = run.controller.state;
      const started = realNow();
      run.controller.cancel();
      const ended = await result;
      const reason = ended.state === 'failed' ? ended.reason : `seen ${seen}`;
      return { ms: realNow() - started, state: ended.state, reason, sourceDisposed: run.source.disposed };
    },
    measure: (width, height) => measure(renderer, width, height),
  };
}
