import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PERSIST_DELAY_MS, restoreShow, STORAGE_KEYS } from '../../../src/show';
import { readSavedShow, showWorld, STORAGE_KEYS as TEST_KEYS } from '../../shared';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const restore = (world: ReturnType<typeof showWorld>): void => restoreShow({ ...world, repaint: () => {} });

describe('ShowStorage', () => {
  it('keeps the storage keys of every earlier version', () => {
    expect(STORAGE_KEYS).toEqual(TEST_KEYS);
    expect(PERSIST_DELAY_MS).toBe(500);
  });

  it('writes once, 500 ms after the last change, the show as it is when the write runs', () => {
    const world = showWorld();
    world.demo.load();
    vi.advanceTimersByTime(400);
    world.tempo.setBpm(99);
    world.bus.emit('showChanged', undefined);
    vi.advanceTimersByTime(499);
    expect(world.store.writes).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(world.store.writes).toEqual([STORAGE_KEYS.show]);
    expect(world.store.items.get(STORAGE_KEYS.show)).toBe(world.json());
  });

  it('drops a failed write without throwing (known quirk: the operator is not told)', () => {
    const world = showWorld();
    world.store.failWrites = true;
    world.storage.persist();
    expect(() => vi.advanceTimersByTime(PERSIST_DELAY_MS)).not.toThrow();
  });
});

describe('restoreShow (boot)', () => {
  it('loads the saved show and starts executor 1 at full (known quirk: level 0 becomes 1)', () => {
    const world = showWorld();
    const saved = JSON.parse(readSavedShow('old-show-v1.json')) as { execs: { level: number }[] };
    const first = saved.execs[0];
    if (first) first.level = 0;
    world.store.setItem(STORAGE_KEYS.show, JSON.stringify(saved));
    restore(world);
    expect([world.execs[0]?.on, world.execs[0]?.cur, world.execs[0]?.level]).toEqual([true, 0, 1]);
    expect(world.execs[1]?.cues.map((c) => c.num)).toContain(5);
  });

  it.each([
    ['nothing is saved', null],
    ['the save is broken JSON', '{"groups":'],
    ['the save has no cue at all (known quirk: an empty show is replaced)', '{"groups":{}}'],
  ])('falls back to the demo and saves it when %s', (_case, saved) => {
    const world = showWorld();
    if (saved !== null) world.store.setItem(STORAGE_KEYS.show, saved);
    restore(world);
    expect(world.execs[0]?.name).toBe('Main Show');
    vi.advanceTimersByTime(PERSIST_DELAY_MS);
    expect(world.store.items.get(STORAGE_KEYS.show)).toBe(world.json());
  });

  it('falls back to the demo when the store cannot be read', () => {
    const world = showWorld();
    world.store.failReads = true;
    restore(world);
    expect(world.execs[0]?.name).toBe('Main Show');
  });

  it('keeps a save that loaded with cues even when starting executor 1 throws (no demo)', () => {
    const world = showWorld();
    world.store.setItem(STORAGE_KEYS.show, readSavedShow('old-show-v1.json'));
    const first = world.execs[0];
    if (!first) throw new Error('the world has no executor 1');
    vi.spyOn(first, 'goto').mockImplementation(() => {
      throw new Error('goto failed');
    });
    const repaint = vi.fn();
    restoreShow({ ...world, repaint });
    expect(world.json()).toBe(readSavedShow('old-show-v1.json').trimEnd());
    expect(repaint).toHaveBeenCalledTimes(1);
  });

  it('falls back to the demo when the desk cannot repaint the saved show, and repaints again', () => {
    const world = showWorld();
    world.store.setItem(STORAGE_KEYS.show, readSavedShow('old-show-v1.json'));
    const repaint = vi.fn().mockImplementationOnce(() => {
      throw new Error('cannot draw');
    });
    restoreShow({ ...world, repaint });
    const demoWorld = showWorld();
    demoWorld.demo.load();
    expect(world.json()).toBe(demoWorld.json());
    expect(repaint).toHaveBeenCalledTimes(2);
  });
});
