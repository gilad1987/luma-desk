import { readMvrMatrix, type Mat4 } from '../../../src/mvr/math/Mat4.ts';

/** A test's known-good MVR `<Matrix>` text as a matrix; bad text throws, so a typo fails the test that wrote it. */
export function mvrMatrix(text: string | undefined): Mat4 {
  const matrix = readMvrMatrix(text);
  if (!matrix) throw new Error(`test matrix does not parse: ${text ?? ''}`);
  return matrix;
}
