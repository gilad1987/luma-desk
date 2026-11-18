import { runFrameSteps } from './frameSteps';
import { ACTIVE_STATES, StillCursor } from './StillCursor';
import type { StillControllerDeps, StillProgress, StillResult, StillState } from './StillWork';

/** The work per frame, in ms: a 60 Hz frame is 16.7 ms, so the live view and the UI keep about 4 ms. */
export const DEFAULT_BUDGET_MS = 12;

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Runs one still render as small steps inside animation frames: `idle -> preparing -> rendering (tile, sample) ->
 * resolving -> encoding -> done | cancelled | failed`. A frame works at most `budgetMs` (and at least one step, so a
 * slow sample still moves on) and restores the renderer state even when a step throws. Nothing exists before `start`.
 * `cancel` ends the render at once: between frames no step runs and the state is already restored.
 */
export class StillController<O> {
  private readonly cursor: StillCursor<O>;
  private frameId: number | null = null;
  private settle: (result: StillResult<O>) => void = () => undefined;
  private readonly now: () => number;
  private readonly deps: StillControllerDeps<O>;

  constructor(deps: StillControllerDeps<O>) {
    this.deps = deps;
    this.now = deps.now ?? (() => performance.now());
    this.cursor = new StillCursor(deps.work, this.now);
  }

  get state(): StillState {
    return this.cursor.state;
  }

  get progress(): StillProgress {
    return this.cursor.progress;
  }

  start(): Promise<StillResult<O>> {
    if (this.cursor.state !== 'idle') throw new Error('a still controller renders once; make a new one');
    this.cursor.state = 'preparing';
    return new Promise((resolve) => {
      this.settle = resolve;
      this.schedule();
    });
  }

  /** Ends the render now; the promise of `start` resolves with `cancelled` before this returns. */
  cancel(): void {
    if (!ACTIVE_STATES.includes(this.cursor.state)) return;
    if (this.frameId !== null) (this.deps.unschedule ?? cancelAnimationFrame)(this.frameId);
    this.frameId = null;
    this.finish({ state: 'cancelled' });
  }

  private schedule(): void {
    this.frameId = (this.deps.schedule ?? requestAnimationFrame)(() => this.frame());
  }

  private frame(): void {
    this.frameId = null;
    const { saveState, budgetMs = DEFAULT_BUDGET_MS } = this.deps;
    const failure = runFrameSteps(this.cursor, saveState, this.now, budgetMs);
    // `finish` reports the failed state itself, so a failure reports progress once
    if (failure !== null) return this.finish({ state: 'failed', reason: describe(failure.error) });
    if (this.cursor.stepping) this.schedule();
    else if (this.cursor.state === 'encoding') void this.encode();
    this.deps.onProgress?.(this.cursor.progress);
  }

  /** The encode is asynchronous; a cancel while it runs wins, and its late result is dropped. */
  private async encode(): Promise<void> {
    try {
      const output = await this.deps.work.encode();
      if (this.cursor.state === 'encoding') this.finish({ state: 'done', output });
    } catch (error) {
      if (this.cursor.state === 'encoding') this.finish({ state: 'failed', reason: describe(error) });
    }
  }

  private finish(result: StillResult<O>): void {
    this.cursor.state = result.state;
    // the caller must hear the result even when freeing a target throws (for example after a lost context)
    try {
      this.deps.work.dispose();
    } finally {
      this.settle(result);
      this.deps.onProgress?.(this.cursor.progress);
    }
  }
}
