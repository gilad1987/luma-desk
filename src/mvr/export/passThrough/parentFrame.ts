import { identity, multiply, readMvrMatrix, type Mat4 } from '../../math/Mat4';
import { childRawText } from '../../xml/elements';

/** Where the parent of a fixture element is in the scene as this export writes it. */
export interface ParentFrame {
  /** Parent to world: the `<Matrix>` of every enclosing object and of the layer, as they are in the tree now. */
  readonly world: Mat4;
  /** True when this export changed the world pose of the parent, so `world` is not the file's own. */
  readonly rewritten: boolean;
}

/**
 * The parent frame of `element`, read from the tree and not from the import's walk: the walk ran before any patch, so
 * its world matrices are the old ones, and a fixture inside a moved fixture would be written against a parent that is
 * no longer there (audit B2). Each owner is the element around the enclosing `<ChildList>` (a `Fixture`, `GroupObject`,
 * `Truss`, `Support` or any other object, then the `Layer`); a missing or unreadable `<Matrix>` is the identity, as the
 * import reads it.
 *
 * `moved` holds the fixture elements this export placed, each with whether its world pose changed; parents come
 * first in the walk, so every owner is final when its children ask. The nearest such owner decides: a fixture the
 * desk did not move keeps its world pose, also under a moved parent, so its own children stand where they stood and
 * keep the text of the file. Only the desk moves anything, so the owners between (groups, trusses) change nothing.
 */
export function parentFrame(element: Element, moved: ReadonlyMap<Element, boolean>): ParentFrame {
  let world = identity();
  let changed: boolean | undefined;
  let owner = element.parentElement?.parentElement;
  while (owner && owner.localName !== 'Layers') {
    world = multiply(readMvrMatrix(childRawText(owner, 'Matrix')) ?? identity(), world);
    changed ??= moved.get(owner);
    owner = owner.parentElement?.parentElement;
  }
  return { world, rewritten: changed ?? false };
}
