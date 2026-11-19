/** `T` with every property allowed to be `undefined`, so a reader can pass what it found without a branch each. */
type Loose<T> = { [K in keyof T]: T[K] | undefined };

/**
 * `value` without its `undefined` properties. The optics data is saved as JSON and compared in tests, and an absent
 * key is how it says "the GDTF does not state this", so an `undefined` key must never be stored.
 */
export function compact<T extends object>(value: Loose<T>): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

/** A number attribute text as a finite number; `undefined` when missing, empty or not a number (`""` is not 0). */
export function toNumber(text: string | undefined): number | undefined {
  const trimmed = text?.trim();
  if (trimmed === undefined || trimmed === '') return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

/** The list, or `undefined` when it is empty: an empty list is not stored. */
export function orAbsent<T>(list: readonly T[]): readonly T[] | undefined {
  return list.length > 0 ? list : undefined;
}
