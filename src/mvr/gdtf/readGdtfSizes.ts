import type { GdtfTreeSize } from './GdtfInfo';
import { buildTree } from './gdtfTree';
import { treeSize } from './gdtfTreeSize';
import { readTreeParts } from './readGdtfBody';

/**
 * The overall size of each top-level geometry tree of `description.xml`, measured on the same expanded tree the body
 * is drawn from (`buildTree`, `treeSize`), so the size and the drawn parts cannot disagree. A tree without a sized
 * model gives no entry. `GeometryReference` models and their children are counted; mesh files are not opened, and
 * the pan and tilt roles do not change a size, so none are given.
 */
export function readSizes(fixtureType: Element): GdtfTreeSize[] {
  const none: ReadonlySet<string> = new Set();
  const parts = { ...readTreeParts(fixtureType, []), pan: none, tilt: none };
  return [...parts.tops].flatMap(([geometry, top]) => {
    const size = treeSize(buildTree(top, parts));
    return size ? [{ geometry, size }] : [];
  });
}
