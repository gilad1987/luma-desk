import { emptyBox, isEmpty, isFiniteBox, union, type Aabb } from '../math/Aabb';
import { identity, multiply, type Mat4 } from '../math/Mat4';
import type { GdtfModel, GdtfNode } from './GdtfBody';
import { partBox, placedBox, type MeshBoxOf } from './gdtfPartBox';

export type { MeshBoxOf, MeshShape } from './gdtfPartBox';

/** The boxes of a tree in the root frame: `fixed` from meshes and hanging parts, `centred` from assumed centred boxes. */
interface TreeBox {
  readonly fixed: Aabb;
  readonly centred: Aabb;
}

/** The boxes of `node` and the parts under it, in the frame of the tree's root. */
function boxOf(node: GdtfNode, parent: Mat4, meshBox: MeshBoxOf | undefined, isRoot: boolean): TreeBox {
  const world = multiply(parent, node.position);
  const own = partBox(node, isRoot, meshBox);
  const placed = own ? placedBox(own, world) : emptyBox();
  let fixed = own?.centred ? emptyBox() : placed;
  let centred = own?.centred ? placed : emptyBox();
  for (const child of node.children) {
    const under = boxOf(child, world, meshBox, false);
    fixed = union(fixed, under.fixed);
    centred = union(centred, under.centred);
  }
  return { fixed, centred };
}

/**
 * The overall size of a geometry tree in metres on X, Y and Z: the box around its parts, each placed through the
 * `Position` chain (`partBox` gives the rule for one part and the GDTF text behind it). A hanging device lies below
 * its origin (GDTF: "0,0,0 - center base plate"; "the offsets are mostly negative, because the device is displayed in
 * a hanging position"), so where most of the tree does, an assumed centred box that reaches above the origin is cut
 * there: a yoke box centred on its pan origin does not rise through the base plate. A measured mesh is never cut. The
 * pigtail and wiring objects are not the body. A mesh with vertices is measured on its turned vertices (`placedBox`).
 * Known limit: a part without vertices under a turn that is not a right angle is measured by its turned box, which is
 * too large. `undefined` when no part gives a box.
 */
export function treeSize(root: GdtfNode, meshBox?: MeshBoxOf): readonly [number, number, number] | undefined {
  const { fixed, centred } = boxOf(root, identity(), meshBox, true);
  const box = union(fixed, centred);
  if (isEmpty(box) || !isFiniteBox(box)) return undefined;
  const { min, max } = box;
  const top = -min[2] >= max[2] ? Math.max(fixed.max[2], Math.min(centred.max[2], 0)) : max[2];
  return [max[0] - min[0], max[1] - min[1], top - min[2]];
}

/** Child indexes from `node` to the first part with beam data, depth first in file order; `undefined` without one. */
export function firstBeam(node: GdtfNode): readonly number[] | undefined {
  if (node.beam) return [];
  for (const [index, child] of node.children.entries()) {
    const path = firstBeam(child);
    if (path) return [index, ...path];
  }
  return undefined;
}

/** Every distinct model the parts of a tree use, in tree order. */
export function treeModels(root: GdtfNode): GdtfModel[] {
  const models = new Set<GdtfModel>();
  const visit = (node: GdtfNode): void => {
    if (node.model) models.add(node.model);
    node.children.forEach(visit);
  };
  visit(root);
  return [...models];
}
