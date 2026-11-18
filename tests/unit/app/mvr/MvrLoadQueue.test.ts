import { describe, expect, it, vi } from 'vitest';
import { MvrLoadQueue } from '../../../../src/app/mvr/MvrLoadQueue';

describe('MvrLoadQueue', () => {
  it('is ready at once before the first load', async () => {
    await expect(new MvrLoadQueue(vi.fn()).ready()).resolves.toBeUndefined();
  });

  it('runs loads one after another and ready() waits for the load queued right before it', async () => {
    const queue = new MvrLoadQueue(vi.fn());
    const steps: string[] = [];
    let finishFirst = (): void => {};
    queue.run(() => new Promise<void>((resolve) => (finishFirst = resolve)).then(() => void steps.push('first')));
    queue.run(() => Promise.resolve().then(() => void steps.push('second')));
    const ready = queue.ready();
    await Promise.resolve();
    expect(steps).toEqual([]);
    finishFirst();
    await ready;
    expect(steps).toEqual(['first', 'second']);
  });

  it('reports a failed load, also a synchronous throw, and still runs the next one', async () => {
    const onError = vi.fn();
    const queue = new MvrLoadQueue(onError);
    const next = vi.fn(() => Promise.resolve());
    queue.run(() => Promise.reject(new Error('bad zip')));
    queue.run(() => {
      throw new Error('bug');
    });
    queue.run(next);
    await queue.ready();
    expect(onError.mock.calls.map(([error]) => (error as Error).message)).toEqual(['bad zip', 'bug']);
    expect(next).toHaveBeenCalledOnce();
  });
});
