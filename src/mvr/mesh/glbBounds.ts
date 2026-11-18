import { emptyBox, isEmpty, transformBox, union, type Aabb } from '../math/Aabb';
import { identity, multiply, type Mat4 } from '../math/Mat4';
import { glbModel } from './glbModel';
import type { GltfModel } from './gltfJson';
import { nodeMatrix } from './nodeMatrix';

/** Deeper node trees are treated as broken, so a long chain of nodes cannot overflow the stack. */
const MAX_DEPTH = 64;

/**
 * One walk over the node tree. `visited` is shared by the whole walk: glTF requires the nodes to form strict trees,
 * and a node listed twice (a shared child, a cycle) would otherwise multiply the work, up to 2^64 visits for a
 * 76-byte file whose only node lists itself twice.
 */
interface NodeWalk {
  readonly model: GltfModel;
  readonly visited: Set<number>;
}

/** The world box of node `index` and its subtree under the parent transform `parent`; each node counts once. */
function nodeBox(walk: NodeWalk, index: number, parent: Mat4, depth: number): Aabb {
  const node = walk.model.nodes[index];
  if (!node || depth > MAX_DEPTH || walk.visited.has(index)) return emptyBox();
  walk.visited.add(index);
  const world = multiply(parent, nodeMatrix(node));
  const mesh = node.mesh === undefined ? undefined : walk.model.meshBoxes[node.mesh];
  let box = mesh ? transformBox(mesh, world) : emptyBox();
  for (const child of node.children) box = union(box, nodeBox(walk, child, world, depth + 1));
  return box;
}

/**
 * The bounds of a GLB mesh in glTF's frame (metres, Y up), from the JSON chunk alone: accessor `min`/`max` through
 * the node tree. Reading no vertex data keeps the import fast on files with hundreds of meshes. `undefined` when the
 * bytes are not GLB 2.0 or hold no positioned geometry; malformed JSON throws.
 */
export function glbBounds(bytes: Uint8Array): Aabb | undefined {
  const model = glbModel(bytes);
  if (!model) return undefined;
  const walk: NodeWalk = { model, visited: new Set() };
  let box = emptyBox();
  for (const root of model.roots) box = union(box, nodeBox(walk, root, identity(), 0));
  return isEmpty(box) ? undefined : box;
}
