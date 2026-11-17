/**
 * Refuses sizes that are not finite numbers > 0, naming the op, the field and every value (rule P7). A zero, NaN or
 * infinite size from a UI field would otherwise reach the renderer as a mesh with no top for beams to land on.
 * @throws RangeError when any size is not finite or not > 0.
 */
export function checkSizes(op: string, sizes: readonly number[], name = 'sizes'): void {
  if (!sizes.every((v) => Number.isFinite(v) && v > 0))
    throw new RangeError(`${op}: ${name} must be finite and > 0, got ${sizes.join(' x ')}`);
}

/**
 * Refuses a point, delta, rotation or angle pair with a NaN or infinite part, naming the op, the field and the value
 * (rule P7), because one bad number would move every fixture linked to the item off into nowhere.
 * @throws RangeError when any part is not finite.
 */
export function checkFinite(op: string, name: string, v: readonly number[]): void {
  if (!v.every(Number.isFinite)) throw new RangeError(`${op}: ${name} must be finite, got [${v.join(', ')}]`);
}

/**
 * Refuses a count that is not a whole number > 0, naming the op, the field and the value (rule P7): a ring with 2.5
 * or 0 drop chains has no chain layout, and the show parser would refuse the saved design.
 * @throws RangeError when `v` is not a positive integer.
 */
export function checkCount(op: string, name: string, v: number): void {
  if (!Number.isInteger(v) || v <= 0) throw new RangeError(`${op}: ${name} must be a positive integer, got ${v}`);
}
