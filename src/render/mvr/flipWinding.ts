import type { BufferGeometry } from 'three';

/** The corner that takes the place of `corner` when each triangle's second and third corners swap. */
function swappedCorner(corner: number, count: number): number {
  const inTriangle = corner % 3;
  if (inTriangle === 1 && corner + 1 < count) return corner + 1;
  if (inTriangle === 2) return corner - 1;
  return corner;
}

/**
 * Reverses the corner order of every triangle of `geometry` in place, as an index. A matrix that mirrors (negative
 * determinant) keeps each normal on the outside when baked into the vertices but turns the corner order, which
 * three.js reads as the front, to the inside; a single-sided material then culls the outside. Swapping two corners
 * per triangle turns the front back out. A geometry without an index gets one, so its vertices are not copied.
 */
export function flipWinding(geometry: BufferGeometry): void {
  const { index } = geometry;
  const count = index?.count ?? geometry.getAttribute('position').count;
  const vertexAt = (corner: number): number => (index ? index.getX(corner) : corner);
  geometry.setIndex(Array.from({ length: count }, (_, corner) => vertexAt(swappedCorner(corner, count))));
}
