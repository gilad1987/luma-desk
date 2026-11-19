import type { FieldReader } from './fieldReader';
import { describeValue, type Raw } from './rawValues';
import type { Reader } from './readers';

/**
 * The ids read so far in one list of the design; a second use of an id is an error. The design links its parts by id
 * (fixtures to trusses, screens to fixtures, builder edits to any part), so two parts with one id would make a link
 * ambiguous. A parser reads the id before the other fields, so the duplicate is reported even when another field is
 * also bad, and `seen` holds the ids of parts that failed on another field.
 */
export class UniqueIds<T extends string | number> {
  readonly #r: Reader;
  readonly #read: FieldReader<T>;
  readonly #seen = new Set<T>();

  /** `read` checks the id value (`r.str` or `r.fixtureId`) before it is compared with the earlier ids. */
  constructor(r: Reader, read: FieldReader<T>) {
    this.#r = r;
    this.#read = read;
  }

  get seen(): ReadonlySet<T> {
    return this.#seen;
  }

  /** Reads the `id` field of the part at path `at` and records it. */
  take(o: Raw, at: string): T | undefined {
    const id = this.#read(o, 'id', at);
    if (id !== undefined && this.#seen.has(id))
      this.#r.fail(this.#r.path(at, 'id'), `duplicate id ${describeValue(id)}`);
    if (id !== undefined) this.#seen.add(id);
    return id;
  }
}
