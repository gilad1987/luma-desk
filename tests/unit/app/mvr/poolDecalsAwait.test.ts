/**
 * The parts of the rule "the floor decals of an MVR stage never draw while its surface light is on its way": the load
 * queue says whether a load still runs, and the lazy chain says whether the load for the stage shown now failed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MvrLoadQueue } from '../../../../src/app/mvr/MvrLoadQueue';
import { emitters } from '../../../../src/render/post/emitters';
import { LazyMvrChain, type MvrChain } from '../../../../src/render/post/LazyMvrChain';

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
  emitters.isHdr = false;
  vi.restoreAllMocks();
});

describe('what the pool decals of an MVR stage wait on', () => {
  it('the load queue is busy from the call of run until its last load ended, also after a failed load', async () => {
    const queue = new MvrLoadQueue(vi.fn());
    expect(queue.isBusy).toBe(false);
    let finish = (): void => {};
    queue.run(() => new Promise<void>((resolve) => (finish = resolve)));
    queue.run(() => Promise.reject(new Error('bad zip')));
    expect(queue.isBusy).toBe(true);
    await Promise.resolve();
    finish();
    await queue.ready();
    expect(queue.isBusy).toBe(false);
  });

  it('the chain has failed only for the stage whose load failed; the next MVR stage starts clean', async () => {
    let isMvrShown = true;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const create = vi.fn<() => Promise<MvrChain>>().mockRejectedValue(new Error('offline'));
    const lazy = new LazyMvrChain(create);
    lazy.follow(() => isMvrShown);
    lazy.select();
    expect(lazy.hasFailed).toBe(false);
    await settle();
    expect(lazy.hasFailed).toBe(true);
    isMvrShown = false;
    lazy.select();
    expect(lazy.hasFailed).toBe(false);
  });

  it('a failed load that arrives after the stage changed does not mark the new stage', async () => {
    let isMvrShown = true;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const lazy = new LazyMvrChain(() => Promise.reject(new Error('offline')));
    lazy.follow(() => isMvrShown);
    lazy.select();
    isMvrShown = false;
    lazy.select();
    await settle();
    expect(lazy.hasFailed).toBe(false);
  });
});
