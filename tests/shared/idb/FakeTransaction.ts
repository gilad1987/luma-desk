import type { FakeIndexedDb } from '../fakeIndexedDb';
import { FakeRequest, type Handler } from './FakeRequest';

/** The parts of the fake database a transaction reads: the records and the write switches. */
type TransactionState = Pick<FakeIndexedDb, 'records' | 'failWrites' | 'abortWrites'>;

/**
 * One fake `IDBTransaction`. It ends in a later macrotask, after its requests, with `complete`; with `error` when a
 * write ran under `failWrites`; or with only `abort` when a write ran under `abortWrites`. The abort case is the
 * quota case of a real browser: the request succeeds, then the transaction aborts and its writes roll back.
 */
export class FakeTransaction {
  error: Error | null = null;
  oncomplete: Handler = null;
  onerror: Handler = null;
  onabort: Handler = null;
  #failed = false;
  #aborted = false;
  readonly #state: TransactionState;
  readonly #before: ReadonlyMap<string, unknown>;

  constructor(state: TransactionState) {
    this.#state = state;
    this.#before = new Map(state.records);
    setTimeout(() => this.#end(), 0);
  }

  objectStore(): object {
    const records = this.#state.records;
    const write = <T>(act: () => T): FakeRequest<T> => {
      this.#failed ||= this.#state.failWrites;
      this.#aborted ||= this.#state.abortWrites;
      return new FakeRequest<T>().settle(this.#state.failWrites, act);
    };
    return {
      put: (value: unknown, key: string) => write(() => records.set(key, value)),
      get: (key: string) => new FakeRequest<unknown>().settle(false, () => records.get(key)),
      count: (key: string) => new FakeRequest<number>().settle(false, () => (records.has(key) ? 1 : 0)),
      delete: (key: string) => write(() => records.delete(key)),
    };
  }

  #end(): void {
    if (this.#failed) {
      this.error = new Error('fake transaction failed');
      this.onerror?.();
    } else if (this.#aborted) {
      this.#state.records.clear();
      this.#before.forEach((value, key) => this.#state.records.set(key, value));
      this.error = new Error('QuotaExceededError');
      this.onabort?.();
    } else {
      this.oncomplete?.();
    }
  }
}
