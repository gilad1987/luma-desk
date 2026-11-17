import { describeValue } from './rawValues';
import type { Reader } from './readers';

/**
 * Adds `id` to `seen` and returns it; a second use is an error. The design links its parts by id (fixtures to trusses,
 * screens to fixtures, builder edits to any part), so two parts with one id would make a link ambiguous. A parser
 * checks the id before the other fields, so the duplicate is reported even when another field is also bad.
 */
export function uniqueId<T extends string | number>(
  r: Reader,
  seen: Set<T>,
  id: T | undefined,
  path: string,
): T | undefined {
  if (id !== undefined && seen.has(id)) r.fail(path, `duplicate id ${describeValue(id)}`);
  if (id !== undefined) seen.add(id);
  return id;
}
