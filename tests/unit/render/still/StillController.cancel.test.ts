import { describe, expect, it } from 'vitest';
import { runAll, setup } from './fakeStillWork';

describe('StillController cancel and failure', () => {
  it('cancels at once, frees the targets and runs no queued frame', async () => {
    const { frames, work, controller, saved } = setup(1, 64);
    const result = controller.start();
    frames.runFrame();
    controller.cancel();
    expect(controller.state).toBe('cancelled');
    expect(frames.pending).toBe(0);
    expect(await result).toEqual({ state: 'cancelled' });
    expect(work.disposed).toBe(1);
    expect(saved.restores).toBe(saved.saves);
    controller.cancel();
    expect(work.disposed).toBe(1);
  });

  it('drops a late encode after a cancel', async () => {
    const { frames, controller } = setup(1, 1);
    const result = controller.start();
    while (frames.pending > 0) frames.runFrame();
    expect(controller.state).toBe('encoding');
    controller.cancel();
    await Promise.resolve();
    expect(await result).toEqual({ state: 'cancelled' });
  });

  it.each(['prepare', 'sample 0.1', 'resolve', 'strip 1', 'encode'])('fails with a reason at %s', async (step) => {
    const { frames, work, controller, saved } = setup(1, 3);
    work.failAt = step;
    const result = controller.start();
    await runAll(frames);
    const reason = step === 'encode' ? 'no PNG' : `broke at ${step}`;
    expect(await result).toEqual({ state: 'failed', reason });
    expect(controller.state).toBe('failed');
    expect(work.disposed).toBe(1);
    expect(saved.restores).toBe(saved.saves);
  });
});
