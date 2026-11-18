/**
 * The lazy MVR post chain: which stage gets it, when it loads, and that a stage change frees it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitters } from '../../../../src/render/post/emitters';
import { LazyMvrChain, type MvrChain } from '../../../../src/render/post/LazyMvrChain';
import { fakeMvrChain as fakeChain } from './fakeMvrChain';

/** A slot on a stage kind the test switches, and a `create` the test resolves itself. */
function slot() {
  let isMvrShown = false;
  const create = vi.fn<() => Promise<MvrChain>>();
  const lazy = new LazyMvrChain(create);
  lazy.follow(() => isMvrShown);
  return { lazy, create, show: (isMvr: boolean) => void (isMvrShown = isMvr) };
}

/** Lets the settled `create` promise run its handlers. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

afterEach(() => (emitters.isHdr = false));

describe('LazyMvrChain', () => {
  it('creates nothing for a built-in stage', () => {
    const { lazy, create } = slot();
    expect(lazy.select()).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
    expect(emitters.isHdr).toBe(false);
  });

  it('loads the chain once for an MVR stage, sizes it, and turns the HDR emitters on when it draws', async () => {
    const { lazy, create, show } = slot();
    const chain = fakeChain();
    create.mockResolvedValue(chain);
    lazy.setSize(800, 400);
    show(true);
    expect(lazy.select()).toBeUndefined();
    expect(emitters.isHdr).toBe(false);
    await settle();
    expect(lazy.select()).toBe(chain);
    expect(lazy.current).toBe(chain);
    expect(create).toHaveBeenCalledTimes(1);
    expect(chain.setSize).toHaveBeenCalledWith(800, 400);
    expect(emitters.isHdr).toBe(true);
  });

  it('frees the chain on a stage change and builds a new one for the next MVR stage', async () => {
    const { lazy, create, show } = slot();
    const [first, second] = [fakeChain(), fakeChain()];
    create.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    show(true);
    lazy.select();
    await settle();
    show(false);
    expect(lazy.select()).toBeUndefined();
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(emitters.isHdr).toBe(false);
    show(true);
    lazy.select();
    await settle();
    expect(lazy.select()).toBe(second);
  });

  it('frees a chain that arrives after the stage changed, and never draws it', async () => {
    const { lazy, create, show } = slot();
    const late = fakeChain();
    create.mockResolvedValue(late);
    show(true);
    lazy.select();
    show(false);
    lazy.select();
    await settle();
    expect(late.dispose).toHaveBeenCalledTimes(1);
    expect(lazy.current).toBeUndefined();
    expect(emitters.isHdr).toBe(false);
  });

  it('keeps the built-in chain when the chunk does not load, and tries again for the next MVR stage', async () => {
    const { lazy, create, show } = slot();
    create.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(fakeChain());
    show(true);
    lazy.select();
    await settle();
    expect(lazy.select()).toBeUndefined();
    expect(create).toHaveBeenCalledTimes(1);
    show(false);
    lazy.select();
    show(true);
    lazy.select();
    await settle();
    expect(lazy.select()).toBeDefined();
  });
});
