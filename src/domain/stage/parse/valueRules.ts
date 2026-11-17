import type { Raw } from './rawValues';

/** One value check of the readers: the guard, and what an error says was expected (`expected a string, got 5`). */
export interface ValueRule<T> {
  readonly accepts: (v: unknown) => v is T;
  readonly expected: string;
}

/** A JSON object; an array or null is not one, as no stored field is either. */
export const OBJECT: ValueRule<Raw> = {
  accepts: (v): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v),
  expected: 'an object',
};

/** Any JSON array; `list` checks each item with its own reader, so one bad item does not drop the rest. */
export const ARRAY: ValueRule<readonly unknown[]> = {
  accepts: (v): v is readonly unknown[] => Array.isArray(v),
  expected: 'an array',
};

/** NaN and the infinities are refused: JSON cannot hold them, so a design with one would not survive a save. */
export const FINITE: ValueRule<number> = {
  accepts: (v): v is number => typeof v === 'number' && Number.isFinite(v),
  expected: 'a finite number',
};

/** A length above zero: a zero or negative size would draw nothing or turn a shape inside out. */
export const POSITIVE: ValueRule<number> = {
  accepts: (v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0,
  expected: 'a number greater than 0',
};

/** A fixture id or a chain count: zero, a negative or a fraction names no fixture and hangs no chain. */
export const POSITIVE_INT: ValueRule<number> = {
  accepts: (v): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0,
  expected: 'a positive integer',
};

/** Any string, the empty one too: a design or truss name is free text that the user typed. */
export const STRING: ValueRule<string> = {
  accepts: (v): v is string => typeof v === 'string',
  expected: 'a string',
};

/** Only `true` or `false`: a JSON 0, 1 or "true" is a broken file, not a flag to guess. */
export const BOOLEAN: ValueRule<boolean> = {
  accepts: (v): v is boolean => typeof v === 'boolean',
  expected: 'true or false',
};
