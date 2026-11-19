import { identity, multiply, readMvrMatrix } from '../../math/Mat4';
import { childElement, childElements, childRawText } from '../../xml/elements';
import { dropChildPositions } from './Integrity';
import { preciseMatrix } from './preciseMatrix';

/** Sets an object's `<Matrix>` text; a new `<Matrix>` goes first, where every MVR object node has it. */
function setMatrix(object: Element, text: string): void {
  const matrix = childElement(object, 'Matrix');
  if (matrix) {
    matrix.textContent = text;
    return;
  }
  const made = object.ownerDocument.createElement('Matrix');
  made.textContent = text;
  object.insertBefore(made, object.firstElementChild);
}

/**
 * Removes a fixture the desk deleted, but first moves every object in its `<ChildList>` (fixtures the desk still has,
 * and any other object) to the list the fixture sat in, with the fixture's matrix composed into theirs, so nothing
 * vanishes and every world position stays. A fixture at the identity leaves its children's matrix text untouched.
 * A moved child loses its `<ChildPosition>`: that is a "Node link to the geometry" of "the linked parent GDTF", and
 * the parent is gone, so the link would name a geometry of nothing, or of the next fixture up (B4). Gives the number
 * of links removed, for the summary.
 */
export function removeFixture(fixture: Element): number {
  const list = childElement(fixture, 'ChildList');
  const parent = fixture.parentNode;
  const hoisted = list && parent ? childElements(list) : [];
  if (parent) {
    const local = readMvrMatrix(childRawText(fixture, 'Matrix'));
    const moved = local !== undefined && local.some((value, index) => value !== identity()[index]);
    for (const child of hoisted) {
      // An unreadable own matrix is the identity, as the import reads it; left alone, the child would lose the
      // removed fixture's placement and move.
      const own = readMvrMatrix(childRawText(child, 'Matrix')) ?? identity();
      if (moved) setMatrix(child, preciseMatrix(multiply(local, own)));
      parent.insertBefore(child, fixture);
    }
  }
  fixture.remove();
  return dropChildPositions(hoisted);
}
