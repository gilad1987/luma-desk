/** A JSON object after the object guard; its values stay `unknown` until a reader checks them. */
export type Raw = Readonly<Record<string, unknown>>;

/** Names a bad value in an error message: strings in quotes, so `"5"` and `5` read differently. */
export function describeValue(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean' || v === null || v === undefined) return String(v);
  if (Array.isArray(v)) return `an array of ${v.length}`;
  return typeof v === 'object' ? 'an object' : `a ${typeof v}`;
}

/**
 * Narrows an object of read results to one where every field was read. A parser reads every field first, so one pass
 * reports every bad field, and only then needs all of them to build its value.
 */
export function allDefined<T extends object>(o: T): o is T & { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.values(o).every((v) => v !== undefined);
}
