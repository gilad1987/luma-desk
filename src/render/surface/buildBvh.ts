import type { Bvh } from './Bvh';

/** A leaf holds at most this many boxes: fewer makes the tree deeper, more makes each leaf test longer. */
const LEAF_SIZE = 4;

/**
 * Past this depth a node cuts its list in half without looking at the boxes. A spatial cut of stacked boxes can
 * shave off one box per level; the plain cut ends that. The depth then stays under this plus 32 halvings of the
 * largest list, which is under `STACK_SIZE`.
 */
const MAX_SPATIAL_DEPTH = 40;

/** A build in progress: `range` is scratch for the node at hand, `next` the first free node, `depth` its depth. */
interface Build {
  readonly boxes: Float32Array;
  readonly bvh: Bvh;
  readonly range: Float64Array;
  next: number;
  depth: number;
}

/** Writes the box of `order[first..end)` into `node`, and into `range` that box and the centroid range (times two). */
function fit({ boxes, bvh, range }: Build, node: number, first: number, end: number): void {
  range.fill(Infinity, 0, 3).fill(-Infinity, 3, 6).fill(Infinity, 6, 9).fill(-Infinity, 9, 12);
  for (let i = first; i < end; i++) {
    const at = (bvh.order[i] ?? 0) * 6;
    for (let k = 0; k < 3; k++) {
      const low = boxes[at + k] ?? 0;
      const high = boxes[at + k + 3] ?? 0;
      range[k] = Math.min(range[k] ?? 0, low);
      range[k + 3] = Math.max(range[k + 3] ?? 0, high);
      range[k + 6] = Math.min(range[k + 6] ?? 0, low + high);
      range[k + 9] = Math.max(range[k + 9] ?? 0, low + high);
    }
  }
  bvh.bounds.set(range.subarray(0, 6), node * 6);
}

/**
 * Cuts `order[first..end)` at the middle of the centroid range on its longest axis: the boxes under the middle move
 * to the front. Returns where the rest starts, or the middle of the list when the cut leaves one side empty.
 */
function cut({ boxes, bvh, range, depth }: Build, first: number, end: number): number {
  const size = [0, 1, 2].map((k) => (range[k + 9] ?? 0) - (range[k + 6] ?? 0));
  const axis = size.indexOf(Math.max(...size));
  const middle = ((range[axis + 6] ?? 0) + (range[axis + 9] ?? 0)) / 2;
  const { order } = bvh;
  let low = first;
  let high = end - 1;
  while (low <= high) {
    const index = order[low] ?? 0;
    const at = index * 6 + axis;
    if ((boxes[at] ?? 0) + (boxes[at + 3] ?? 0) < middle) low++;
    else {
      order[low] = order[high] ?? 0;
      order[high] = index;
      high--;
    }
  }
  return low === first || low === end || depth > MAX_SPATIAL_DEPTH ? (first + end) >> 1 : low;
}

/** Makes `node` the root of `order[first..end)`: a leaf for a short list, else two children that share it. */
function split(build: Build, node: number, first: number, end: number): void {
  const { links } = build.bvh;
  fit(build, node, first, end);
  if (end - first <= LEAF_SIZE) {
    links[node * 2] = first;
    links[node * 2 + 1] = end - first;
    return;
  }
  const middle = cut(build, first, end);
  const left = build.next;
  build.next += 2;
  links[node * 2] = left;
  build.depth += 1;
  split(build, left, first, middle);
  split(build, left + 1, middle, end);
  build.depth -= 1;
}

/**
 * Builds the hierarchy over `boxes` (six floats each: minimum, then maximum). One pass per level and no sort, which
 * keeps the build of a large stage well under a second. No boxes give one empty node that no ray enters.
 */
export function buildBvh(boxes: Float32Array): Bvh {
  const count = boxes.length / 6;
  const nodeLimit = Math.max(1, 2 * count - 1);
  const bvh: Bvh = {
    bounds: new Float32Array(nodeLimit * 6),
    links: new Uint32Array(nodeLimit * 2),
    order: new Uint32Array(count),
  };
  for (let i = 0; i < count; i++) bvh.order[i] = i;
  split({ boxes, bvh, range: new Float64Array(12), next: 1, depth: 0 }, 0, 0, count);
  return bvh;
}
