/**
 * A bounding volume hierarchy over boxes, flat in typed arrays, so a ray walk reads memory in order and allocates
 * nothing. The triangles of one mesh and the mesh instances of a stage both use it.
 */
export interface Bvh {
  /** Six floats per node: the box minimum x, y, z, then the maximum. */
  readonly bounds: Float32Array;
  /**
   * Two ints per node. A leaf: its first slot in `order`, then its count. An inner node: its left child, then 0; the
   * right child is the node after the left one.
   */
  readonly links: Uint32Array;
  /** The box indices, grouped by leaf. */
  readonly order: Uint32Array;
}

/** A walk stack of this size fits every tree: see the depth limit in `buildBvh`. */
export const STACK_SIZE = 96;
