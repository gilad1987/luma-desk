import type { GdtfNode } from '../../../mvr/gdtf/GdtfBody';

/** The first part with this role, parents before children. */
export function find(node: GdtfNode, role: 'pan' | 'tilt'): GdtfNode | undefined {
  if (node.role === role) return node;
  for (const child of node.children) {
    const hit = find(child, role);
    if (hit) return hit;
  }
  return undefined;
}

/** The part at the end of a path of child indexes from `root`; undefined without a path. */
export function nodeAt(root: GdtfNode, path: readonly number[] | undefined): GdtfNode | undefined {
  let node: GdtfNode | undefined = path ? root : undefined;
  for (const index of path ?? []) node = node?.children[index];
  return node;
}
