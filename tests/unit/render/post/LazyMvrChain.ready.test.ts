/**
 * `LazyMvrChain.ready`: the test API's `mvrReady` waits on it, so a GPU memory reading counts the chain's targets.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitters } from '../../../../src/render/post/emitters';
import { LazyMvrChain, type MvrChain } from '../../../../src/render/post/LazyMvrChain';
import { fakeMvrChain } from './fakeMvrChain';

/** A slot that shows an MVR stage, with a `create` whose promise the test settles itself. */
function slot() {
  let settleCreate: { resolve: (chain: MvrChain) => void; reject: (error: Error) => void } | undefined;
  const create = vi.fn(() => new Promise<MvrChain>((resolve, reject) => void (settleCreate = { resolve, reject })));
  const lazy = new LazyMvrChain(create);
  lazy.follow(() => true);
  const created = () => {
    if (!settleCreate) throw new Error('no load started');
    return settleCreate;
  };
  return { lazy, created };
}

/** True when `promise` has settled after the queued handlers ran. */
async function isSettled(promise: Promise<void>): Promise<boolean> {
  let settled = false;
  void promise.then(() => void (settled = true));
  await new Promise((resolve) => setTimeout(resolve));
  return settled;
}

afterEach(() => {
  emitters.isHdr = false;
  vi.restoreAllMocks();
});

describe('LazyMvrChain.ready', () => {
  it('resolves at once when no load started', async () => {
    const { lazy } = slot();
    expect(await isSettled(lazy.ready())).toBe(true);
  });

  it('resolves only after the chain is created, with the chain then drawing', async () => {
    const { lazy, created } = slot();
    lazy.select();
    const ready = lazy.ready();
    expect(await isSettled(ready)).toBe(false);
    const chain = fakeMvrChain();
    created().resolve(chain);
    await ready;
    expect(lazy.current).toBe(chain);
  });

  it('resolves when the load fails, and the built-in chain stays', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { lazy, created } = slot();
    lazy.select();
    const ready = lazy.ready();
    created().reject(new Error('chunk not loaded'));
    await expect(ready).resolves.toBeUndefined();
    expect(lazy.current).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
