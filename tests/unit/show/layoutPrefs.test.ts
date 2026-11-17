import { describe, expect, it } from 'vitest';
import { GuideFlag, LayoutPrefs, STORAGE_KEYS } from '../../../src/show';
import { MemoryStore } from './MemoryStore';

const MA_SIZE = 0.47;
const stored = (raw: string | null) => {
  const store = new MemoryStore();
  if (raw !== null) store.setItem(STORAGE_KEYS.layout, raw);
  return new LayoutPrefs(store).load(MA_SIZE);
};

describe('LayoutPrefs', () => {
  it('saves deskMode, deskZoom, maSize in that order and drops an undefined size', () => {
    const store = new MemoryStore();
    const prefs = new LayoutPrefs(store);
    prefs.save({ maSize: 0.5, deskZoom: '90', deskMode: 'desk' });
    expect(store.items.get(STORAGE_KEYS.layout)).toBe('{"deskMode":"desk","deskZoom":"90","maSize":0.5}');
    prefs.save({ deskMode: 'ma', deskZoom: 'auto', maSize: undefined });
    expect(store.items.get(STORAGE_KEYS.layout)).toBe('{"deskMode":"ma","deskZoom":"auto"}');
  });

  it('reads nothing saved, broken JSON and JSON null as no layout', () => {
    expect([stored(null), stored('{'), stored('null'), stored('')]).toEqual([null, null, null, null]);
  });

  it('reads a saved value that is not an object as the defaults, as the original did', () => {
    const defaults = { deskMode: 'ma', deskZoom: 'auto', maSize: undefined };
    expect([stored('5'), stored('"desk"'), stored('[]')]).toEqual([defaults, defaults, defaults]);
  });

  it('fills missing modes and clamps the size into 0.3-0.7', () => {
    expect(stored('{"maSize":0.9}')).toEqual({ deskMode: 'ma', deskZoom: 'auto', maSize: 0.7 });
    expect(stored('{"deskMode":"desk","maSize":"0.1"}')?.maSize).toBe(0.3);
    expect(stored('{"maSize":0}')?.maSize).toBeUndefined();
  });

  it('reads the default size as adaptive (known quirk D7)', () => {
    expect(stored('{"maSize":0.47}')?.maSize).toBeUndefined();
  });

  it('drops write errors and reads blocked storage as no layout', () => {
    const store = new MemoryStore();
    store.failWrites = true;
    store.failReads = true;
    const prefs = new LayoutPrefs(store);
    expect(() => prefs.save({ deskMode: 'ma', deskZoom: 'auto', maSize: undefined })).not.toThrow();
    expect(prefs.load(MA_SIZE)).toBeNull();
  });
});

describe('GuideFlag', () => {
  it('is unseen until marked, and blocked storage counts as seen (the guide never opens)', () => {
    const store = new MemoryStore();
    const flag = new GuideFlag(store);
    expect(flag.seen()).toBe(false);
    flag.markSeen();
    expect([flag.seen(), store.items.get(STORAGE_KEYS.guideSeen)]).toEqual([true, '1']);
    store.failReads = true;
    store.failWrites = true;
    expect(flag.seen()).toBe(true);
    expect(() => flag.markSeen()).not.toThrow();
  });
});
