import type { Vec3 } from '../types';

/**
 * Refuses sizes that are not finite numbers > 0, naming the op and every value (rule P7). A zero, NaN or infinite
 * size from a UI field would otherwise reach the renderer as a mesh with no top for beams to land on.
 * @throws RangeError when any size is not finite or not > 0.
 */
export function checkSizes(op: string, sizes: readonly number[]): void {
  if (!sizes.every((v) => Number.isFinite(v) && v > 0))
    throw new RangeError(`${op}: sizes must be finite and > 0, got ${sizes.join(' x ')}`);
}

/**
 * Refuses a point or delta with a NaN or infinite part, naming the op, the field and the value (rule P7), because
 * one bad number would move every fixture linked to the item off into nowhere.
 * @throws RangeError when any part is not finite.
 */
export function checkFinite(op: string, name: string, v: Vec3): void {
  if (!v.every(Number.isFinite)) throw new RangeError(`${op}: ${name} must be finite, got [${v.join(', ')}]`);
}
