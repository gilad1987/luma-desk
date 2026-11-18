import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShowFiles } from '../../../../src/app/uix/createShowFiles';
import { PERSIST_DELAY_MS, STORAGE_KEYS } from '../../../../src/show';
import { MemoryStore } from '../../../shared';
import { engineParts } from './engineParts';

/** Builds the show objects on a real engine; the page storage is stubbed afterwards, as it is read on each call. */
function build(parts = engineParts()) {
  const files = createShowFiles({ ...parts, execs: parts.pool.execs }),
    store = new MemoryStore();
  vi.stubGlobal('localStorage', store);
  return { files, stored: store.items };
}

describe('createShowFiles', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reads the page storage when used, not when built', () => {
    const { files, stored } = build();
    expect(files.guideFlag.seen()).toBe(false);
    files.guideFlag.markSeen();
    expect([files.guideFlag.seen(), stored.has(STORAGE_KEYS.guideSeen)]).toEqual([true, true]);
  });

  it('saves the serialized show under the show key after the delay', () => {
    vi.useFakeTimers();
    const { files, stored } = build();
    files.showStorage.persist();
    expect(stored.has(STORAGE_KEYS.show)).toBe(false);
    vi.advanceTimersByTime(PERSIST_DELAY_MS);
    const expected: unknown = JSON.parse(JSON.stringify(files.serializer.serialize()));
    expect(JSON.parse(stored.get(STORAGE_KEYS.show) ?? 'null')).toEqual(expected);
  });

  it('saves after a show edit reports showChanged', () => {
    vi.useFakeTimers();
    const parts = engineParts();
    const { stored } = build(parts);
    parts.bus.emit('showChanged', undefined);
    vi.advanceTimersByTime(PERSIST_DELAY_MS);
    expect(stored.has(STORAGE_KEYS.show)).toBe(true);
  });
});
