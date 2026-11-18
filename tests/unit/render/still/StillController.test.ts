import { describe, expect, it } from 'vitest';
import { runAll, setup } from './fakeStillWork';

describe('StillController', () => {
  it('walks every state in order and ends done with the output', async () => {
    const { frames, work, controller, progress, saved } = setup();
    expect(controller.state).toBe('idle');
    const result = controller.start();
    expect(controller.state).toBe('preparing');
    await runAll(frames);
    expect(await result).toEqual({ state: 'done', output: 'png' });
    expect(work.calls).toEqual(
      [
        'prepare',
        'sample 0.0',
        'sample 0.1',
        'sample 0.2',
        'tile 0 x3',
        'sample 1.0',
        'sample 1.1',
        'sample 1.2',
      ].concat(['tile 1 x3', 'resolve', 'strip 0', 'strip 1', 'encode']),
    );
    expect(progress.map((p) => p.state)).toContain('done');
    expect(progress.at(-1)?.fraction).toBe(1);
    expect(saved.restores).toBe(saved.saves);
    expect(work.disposed).toBe(1);
    expect(() => controller.start()).toThrow();
  });

  it('works at most the budget per frame but always one step', () => {
    const { frames, work, controller } = setup(1, 40, 5, 12);
    void controller.start();
    frames.runFrame();
    // steps of 5 ms: 0 -> 5 -> 10 -> 15, the third step ends past 12 ms
    expect(work.calls).toEqual(['prepare', 'sample 0.0', 'sample 0.1']);
    const slow = setup(1, 4, 50, 12);
    void slow.controller.start();
    slow.frames.runFrame();
    expect(slow.work.calls).toEqual(['prepare']);
    slow.frames.runFrame();
    expect(slow.work.calls).toEqual(['prepare', 'sample 0.0']);
    expect(slow.controller.progress.etaMs).toBe(50 * 3);
  });

  it('ends a frame when the GPU is busy and runs the step in a later frame', async () => {
    const { frames, work, controller } = setup(1, 3, 1, 100);
    const result = controller.start();
    frames.runFrame();
    expect(work.calls.at(-1)).toBe('encode');
    const busy = setup(1, 3, 1, 100);
    void busy.controller.start();
    busy.work.busyPolls = 2;
    busy.frames.runFrame();
    expect(busy.work.calls).toEqual(['busy']);
    busy.frames.runFrame();
    busy.frames.runFrame();
    expect(busy.work.calls.slice(0, 4)).toEqual(['busy', 'busy', 'prepare', 'sample 0.0']);
    expect((await result).state).toBe('done');
  });

  it('moves to the next tile when a tile converges early', async () => {
    const { frames, work, controller } = setup(2, 256);
    work.convergeAt = 16;
    void controller.start();
    await runAll(frames);
    expect(work.calls.filter((c) => c.startsWith('tile'))).toEqual(['tile 0 x16', 'tile 1 x16']);
  });
});
