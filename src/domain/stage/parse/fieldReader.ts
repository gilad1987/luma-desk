import type { Raw } from './rawValues';

/** An object key, or a list index when `list` reads an item; an index is named `[i]` in an error path. */
export type Key = string | number;

/** Reads field `key` of `o`, whose own path is `at`; returns the checked value or records an error and `undefined`. */
export type FieldReader<T> = (o: Raw, key: Key, at: string) => T | undefined;

/** The values a field may take, and the word an error uses for a value outside them (`unknown role "x"`). */
export interface Choices<T> {
  readonly options: readonly T[];
  readonly what: string;
}

/** How many numbers a tuple field holds, and the reader (`num` or `positive`) each one must pass. */
export interface NumbersShape {
  readonly size: number;
  readonly item: FieldReader<number>;
}
