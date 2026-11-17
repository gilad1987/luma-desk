import { Reader } from '../parse/readers';
import { FINITE, POSITIVE } from '../parse/valueRules';

/**
 * Refuses sizes that are not finite numbers > 0, naming the op and every value (rule P7). A zero, NaN or infinite
 * size from a UI field would otherwise reach the renderer as a mesh with no top for beams to land on. The rule is the
 * parser's `POSITIVE`, so an edit never saves a size the next show load would refuse.
 * @throws RangeError when any size is not finite or not > 0.
 */
export function checkSizes(op: string, sizes: readonly number[]): void {
  if (sizes.some((v) => !POSITIVE.accepts(v)))
    throw new RangeError(`${op}: sizes must be finite and > 0, got ${sizes.join(' x ')}`);
}

/**
 * Refuses a point or delta with a NaN or infinite part, naming the op, the field and the value (rule P7), because one
 * bad number would move every fixture linked to the item off into nowhere. The rule is the parser's `FINITE`.
 * @throws RangeError when any part is not finite.
 */
export function checkFinite(op: string, name: string, v: readonly number[]): void {
  if (v.some((part) => !FINITE.accepts(part)))
    throw new RangeError(`${op}: ${name} must be finite, got [${v.join(', ')}]`);
}

/**
 * Runs a show parser reader over an edited list and refuses the edit when the parser records an error (rule P6). The
 * parser is the one owner of the stored-design rules, so an edit never saves an item the next show load would refuse,
 * and a rule added to the parser reaches the edit ops without a second copy here. The reader's result is returned, so
 * the op stores what the parser reads and the design in memory equals the design after a save and load.
 * @throws RangeError naming the op and every parser error, each with its path and value (rule P7).
 */
export function checkParserAccepts<T>(op: string, read: (r: Reader) => T): T {
  const r = new Reader();
  const result = read(r);
  if (r.errors.length > 0) throw new RangeError(`${op}: ${r.errors.join('; ')}`);
  return result;
}
