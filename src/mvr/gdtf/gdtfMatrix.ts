import { identity, type Mat4 } from '../math/Mat4';

/**
 * A GDTF `Matrix`: 4 x 4 numbers in row-major order, one row per brace group, the translation in the 4th column, in
 * metres. A missing or malformed one reads as the identity, the GDTF default.
 */
export function readGdtfMatrix(text: string | undefined): Mat4 {
  const numbers = (text?.match(/[^{},\s]+/g) ?? []).map(Number);
  const m = identity();
  if (numbers.length !== 16 || !numbers.every(Number.isFinite)) return m;
  // `Mat4` holds columns, the text holds rows
  numbers.forEach((value, index) => (m[(index % 4) * 4 + Math.floor(index / 4)] = value));
  return m;
}
