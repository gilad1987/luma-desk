/**
 * True when a patch field leaves the current value as it is: the field is not set, or it holds the same data. Value
 * compare, not identity, because the property panel builds a new tuple or params object for every edit; the edit ops
 * use it to return the design itself for an unchanged patch, so History adds no undo step.
 */
export function isKept<T>(next: T | undefined, current: T | undefined): boolean {
  return next === undefined || isSameData(next, current);
}

/** Deep compare of plain design data: numbers, strings, booleans, null, arrays and records of them. */
function isSameData(a: unknown, b: unknown): boolean {
  if (isList(a) && isList(b)) return a.length === b.length && a.every((v, i) => isSameData(v, b[i]));
  if (isRecord(a) && isRecord(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => isSameData(a[k], b[k]));
  }
  return a === b;
}

function isList(v: unknown): v is readonly unknown[] {
  return Array.isArray(v);
}

function isRecord(v: unknown): v is Readonly<Record<string, unknown>> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
