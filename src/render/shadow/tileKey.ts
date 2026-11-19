/** Words per key. */
export const KEY = 9;

/**
 * The floats of a beam row that shape its shadow frustum: origin, length, axis, tan of the field half angle and lens
 * radius (see `packBeam.ts`). Colour, gobo and rotation change the light, not what blocks it, so they are not in it.
 */
const FIELDS = [0, 1, 2, 3, 4, 5, 6, 7, 14] as const;

/** The bits of the rows. Keys compare bits, as `HitCache` does: a float compare would call -0 and 0 one beam. */
export const rowWords = (rows: Float32Array): Uint32Array => new Uint32Array(rows.buffer, rows.byteOffset, rows.length);

/** True when the row that starts at word `row` has the key in `slot`. */
export function sameKey(words: Uint32Array, row: number, keys: Uint32Array, slot: number): boolean {
  for (let k = 0; k < KEY; k++) if (words[row + (FIELDS[k] ?? 0)] !== keys[slot * KEY + k]) return false;
  return true;
}

export function storeKey(words: Uint32Array, row: number, keys: Uint32Array, slot: number): void {
  for (let k = 0; k < KEY; k++) keys[slot * KEY + k] = words[row + (FIELDS[k] ?? 0)] ?? 0;
}

/**
 * How far a row may be from a key and still be one step of the same light: metres at the origin, the chord of the
 * turn of the axis (0.05 is 2.9 degrees; one 8-bit pan step of 540 degrees is 2.1), and a part of the length, the
 * tan and the lens. Two fixtures are never this near each other.
 */
const STEP = { origin: 0.05, axis: 0.05, part: 0.1 } as const;

/** The float of a word, by its bits: a typed array for it would be one more object in the frame loop. */
function toFloat(bits: number): number {
  const exponent = (bits >>> 23) & 0xff;
  const mantissa = bits & 0x7fffff;
  const size = exponent === 0 ? mantissa * 2 ** -149 : (mantissa + 0x800000) * 2 ** (exponent - 150);
  return bits >>> 31 === 1 ? -size : size;
}

/** True when the row that starts at word `row` is at most one small step from the key in `slot` (see `STEP`). */
export function nearKey(words: Uint32Array, row: number, keys: Uint32Array, slot: number): boolean {
  let moved = 0;
  let turned = 0;
  for (let k = 0; k < KEY; k++) {
    const a = toFloat(words[row + (FIELDS[k] ?? 0)] ?? 0);
    const b = toFloat(keys[slot * KEY + k] ?? 0);
    if (k < 3) moved += (a - b) ** 2;
    else if (k > 3 && k < 7) turned += (a - b) ** 2;
    else if (Math.abs(a - b) > STEP.part * Math.max(Math.abs(a), Math.abs(b))) return false;
  }
  return moved <= STEP.origin ** 2 && turned <= STEP.axis ** 2;
}

/**
 * A hash of the key words, unsigned. The words are float bits, and rows of round numbers differ only in their high
 * bits; a multiply moves a difference up, never down, so each step and the end fold the high bits into the low
 * ones. Without that, lights one metre apart would all share the low bits a table index is taken from.
 */
export function hashKey(words: Uint32Array, row: number): number {
  let hash = 2166136261;
  for (const field of FIELDS) {
    hash = Math.imul(hash ^ (words[row + field] ?? 0), 16777619);
    hash ^= hash >>> 15;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  return (hash ^ (hash >>> 13)) >>> 0;
}
