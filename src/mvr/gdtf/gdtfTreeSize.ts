import { emptyBox, isEmpty, isFiniteBox, transformBox, union, type Aabb } from '../math/Aabb';
import { identity, multiply, type Mat4 } from '../math/Mat4';
import type { GdtfModel, GdtfNode } from './GdtfBody';

/** The box of `node` and the parts under it, in the frame of the tree's root. */
function boxOf(node: GdtfNode, parent: Mat4, depth: number): Aabb {
  const world = multiply(parent, node.position);
  const [x, y, z] = node.model?.size ?? [0, 0, 0];
  // the top part hangs from the device origin, the centre of its base plate; every other part is drawn around its own
  const own: Aabb = { min: [-x / 2, -y / 2, depth === 0 ? -z : -z / 2], max: [x / 2, y / 2, depth === 0 ? 0 : z / 2] };
  let box = x + y + z > 0 ? transformBox(own, world) : emptyBox();
  for (const child of node.children) box = union(box, boxOf(child, world, depth + 1));
  return box;
}

/**
 * The overall size of a geometry tree in metres on X, Y and Z: the box around the model boxes of its parts, each
 * placed through the `Position` chain. GDTF: Length, Width and Height are metres on X, Y and Z, the mesh is scaled to
 * them, and the device hangs with Z up and its origin at the centre of the base plate. The file does not say where a
 * mesh sits in its box, so this takes the top part as hanging below the origin and every deeper part as centred on
 * its own (GDTF: a part is drawn around its suspension point and centred on its axis of rotation). The result can be
 * wrong by half the size of an outermost part. `undefined` when no part has a sized model.
 */
export function treeSize(root: GdtfNode): readonly [number, number, number] | undefined {
  const box = boxOf(root, identity(), 0);
  if (isEmpty(box) || !isFiniteBox(box)) return undefined;
  const { min, max } = box;
  // a hanging device lies below its origin: where most of the tree does, a centred box that reaches above is cut
  const top = -min[2] >= max[2] ? Math.min(max[2], 0) : max[2];
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
