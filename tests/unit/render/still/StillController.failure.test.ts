import { describe, expect, it } from 'vitest';
import { StillController } from '../../../../src/render/still/StillController';
import { FakeFrames } from './fakeFrames';
import { FakeStillWork, runAll, setup } from './fakeStillWork';
import type { StillProgress } from '../../../../src/render/still/StillWork';

/** A controller whose state save or restore throws. */
function setupBroken(broken: 'save' | 'restore') {
  const frames = new FakeFrames();
  const work = new FakeStillWork(1, 2, frames);
  const progress: StillProgress[] = [];
  const saveState = (): (() => void) => {
    if (broken === 'save') throw new Error('no save');
    return () => {
      throw new Error('no restore');
    };
  };
  const { schedule, unschedule, now } = frames;
  const onProgress = (p: StillProgress): number => progress.push(p);
  const controller = new StillController({ work, saveState, schedule, unschedule, now, onProgress });
  return { frames, work, progress, controller };
}

describe('StillController failures of the state save', () => {
  it('fails the run, disposes once and reports once when the save throws', async () => {
    const { frames, work, progress, controller } = setupBroken('save');
    const result = controller.start();
    expect(() => frames.runFrame()).not.toThrow();
    expect(await result).toEqual({ state: 'failed', reason: 'no save' });
    expect(work.calls).toEqual([]);
    expect(work.disposed).toBe(1);
    expect(progress.map((p) => p.state)).toEqual(['failed']);
    expect(frames.pending).toBe(0);
  });

  it('fails the run, disposes once and reports once when the restore throws', async () => {
    const { frames, work, progress, controller } = setupBroken('restore');
    const result = controller.start();
    expect(() => frames.runFrame()).not.toThrow();
    expect(await result).toEqual({ state: 'failed', reason: 'no restore' });
    expect(work.calls).not.toContain('encode');
    expect(work.disposed).toBe(1);
    expect(progress.map((p) => p.state)).toEqual(['failed']);
    expect(frames.pending).toBe(0);
  });

  it('keeps the step error when the restore throws after it', async () => {
    const { frames, work, controller } = setupBroken('restore');
    work.failAt = 'prepare';
    const result = controller.start();
    frames.runFrame();
    expect(await result).toEqual({ state: 'failed', reason: 'broke at prepare' });
    expect(work.disposed).toBe(1);
  });

  it('fails the run when the work reports a lost context in any phase', async () => {
    const { frames, work, controller } = setup(1, 3, 1, 100);
    work.ready = (): boolean => {
      if (work.calls.includes('resolve')) throw new Error('the WebGL context was lost during the still render');
      return true;
    };
    const result = controller.start();
    await runAll(frames);
    expect(await result).toEqual({ state: 'failed', reason: 'the WebGL context was lost during the still render' });
    expect(work.calls).not.toContain('strip 0');
    expect(work.disposed).toBe(1);
  });

  it('reports a failed step once and restores the state', async () => {
    const { frames, work, progress, saved, controller } = setup();
    work.failAt = 'prepare';
    const result = controller.start();
    frames.runFrame();
    expect(await result).toEqual({ state: 'failed', reason: 'broke at prepare' });
    expect(progress.map((p) => p.state)).toEqual(['failed']);
    expect(saved.restores).toBe(saved.saves);
  });
});
