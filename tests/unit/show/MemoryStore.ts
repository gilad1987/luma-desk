import type { KeyValueStore } from '../../../src/show';

/** An in-memory `KeyValueStore` that records writes and can fail like a full or blocked localStorage. */
export class MemoryStore implements KeyValueStore {
  readonly items = new Map<string, string>();
  readonly writes: string[] = [];
  failReads = false;
  failWrites = false;

  getItem(key: string): string | null {
    if (this.failReads) throw new Error('SecurityError: storage blocked');
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('QuotaExceededError: storage full');
    this.writes.push(key);
    this.items.set(key, value);
  }
}
