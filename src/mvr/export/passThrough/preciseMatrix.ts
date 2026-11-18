import { identity, type Mat4 } from '../../math/Mat4';

/**
 * A number as the shortest text that reads back to the same 64-bit float. The MVR 1.6 Float type: "Implementations
 * shall write sufficient decimal places to precisely round-trip their internal level of precision", in "base 10
 * decimal or scientific format", so the exponent JavaScript writes for a very small or large value is valid. Six
 * decimals are not enough for a matrix the export computes: a fixture inside a group scaled by 1000 has local axes of
 * length 0.001, which six decimals cut to three digits (audit C8).
 */
const numberText = (value: number): string => (value === 0 ? '0' : String(value));

/**
 * A matrix the pass-through export computed, as `<Matrix>` text `{u}{v}{w}{o}` that `readMvrMatrix` reads back to the
 * same 16 numbers. Only rewritten nodes get it; every other node keeps the text of the file.
 */
export function preciseMatrix(m: Mat4): string {
  const column = (col: number): string => `{${[0, 1, 2].map((row) => numberText(m[col * 4 + row] ?? 0)).join(',')}}`;
  return [0, 1, 2, 3].map(column).join('');
}

/** A billionth of a millimetre and of a unit axis: far below what the desk can place, above float noise. */
const DECIMALS = 9;

/**
 * A desk pose without the float noise of its quaternion and of the metre to millimetre step (`0.9999999999999998`,
 * `6e-17`, `1200.0000000000002`), so a fixture moved on the desk gets the text a person would write.
 */
export function withoutNoise(m: Mat4): Mat4 {
  return m.map((value) => Number(value.toFixed(DECIMALS)));
}

/** Whether a parent frame is exactly the identity: a fixture right in a layer without a matrix. */
export function isIdentity(m: Mat4): boolean {
  const plain = identity();
  return m.every((value, index) => value === plain[index]);
}

/**
 * A local matrix the export computed under a parent, without the noise of the inverse and the product
 * (`1.6653345369377348e-16`, `150.70000000000002`): 12 significant digits, as a local axis under a scaled group can
 * be short (`0.001`), and a cell within `1e-12` of 0, 1 or -1 is that number.
 */
export function withoutLocalNoise(m: Mat4): Mat4 {
  return m.map((value) => [0, 1, -1].find((whole) => Math.abs(value - whole) < 1e-12) ?? Number(value.toPrecision(12)));
}
