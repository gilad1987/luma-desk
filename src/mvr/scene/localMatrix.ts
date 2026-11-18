import { identity, readMvrMatrix, type Mat4 } from '../math/Mat4';
import { attr, childText } from '../xml/elements';
import type { BadMatrices } from './BadMatrices';

/**
 * An element's own `<Matrix>`, identity when it has none. A malformed one also gives identity, so one bad object is
 * still imported, but it counts in the import's `bad` matrices with the element's uuid: the object then sits at its
 * parent's origin, and the user must know why it moved.
 */
export function localMatrix(el: Element, bad: BadMatrices): Mat4 {
  const matrix = readMvrMatrix(childText(el, 'Matrix'));
  if (matrix) return matrix;
  bad.add(attr(el, 'uuid') ?? el.localName);
  return identity();
}
