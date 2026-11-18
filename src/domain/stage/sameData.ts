/**
 * Two lengths (metres) this close are the same size: a deck or wall resized around its centre gets float noise back
 * (x1 - x0 of an off-centre deck is not exactly the width it was given).
 */
const LENGTH_TOLERANCE_M = 1e-9;

/**
 * Deep compare of plain design data: numbers, strings, booleans, null, arrays and records of them. Value compare, not
 * identity, because the property panel builds a new tuple or params object for every edit. Two users: the edit ops
 * compare the list the parser read with the stored list, so every key counts, a field added later too, and a patch that
 * changes no stored value returns the design itself, so History adds no undo step. The show load (`show/stageField`)
 * compares the parsed `stage` with the active design, so loading the show the desk booted on does not rebuild the rig.
 */
export function isSameData(a: unknown, b: unknown): boolean {
  if (isList(a) && isList(b)) return a.length === b.length && a.every((v, i) => isSameData(v, b[i]));
  if (isRecord(a) && isRecord(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => isSameData(a[k], b[k]));
  }
  return a === b;
}

/** True when a size edit would only move a length by float noise, so the resize ops can return the design itself. */
export function isSameLength(a: number, b: number): boolean {
  return Math.abs(a - b) <= LENGTH_TOLERANCE_M;
}

function isList(v: unknown): v is readonly unknown[] {
  return Array.isArray(v);
}

function isRecord(v: unknown): v is Readonly<Record<string, unknown>> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
