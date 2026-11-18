/**
 * A point or a direction in the figure frame, metres: X across the shoulders, Y up from the seat, Z to the back. The
 * origin is where the spine meets the seat at the seat back, and the figure looks along -Z, as a seat proxy does.
 */
export type P3 = readonly [number, number, number];

/** The colour masks of a figure. The shader gives each mask its own colour of the instance (`audienceShader.ts`). */
export const MASK = { top: 0, skin: 1, hair: 2, legs: 3, shoe: 4 } as const;

/**
 * The surface at one corner of a ring: its colour mask, how far out it sits (1 = on the ellipse) and how dark it is
 * (1 = the full colour). Shape and shade are all a face has: there is no texture.
 */
export type Corner = readonly [mask: number, reach: number, shade?: number];

/** One cross-section of a body part: the ellipse `c + cos(a)·u + sin(a)·v`. */
export interface Ring {
  readonly c: P3;
  readonly u: P3;
  readonly v: P3;
  readonly surface: (a: number) => Corner;
}

/** The triangles of a figure while it is built. */
export interface FigureMesh {
  readonly positions: number[];
  /** Per vertex: colour mask and shade (`aPart`). */
  readonly parts: number[];
  /** Per vertex: the point the head turns about, and 1 for a vertex that turns with the head, else 0 (`aHead`). */
  readonly heads: number[];
  readonly index: number[];
}

/**
 * Adds the skin over `rings` to `mesh`: quads between neighbour rings and a fan over both ends. Each part is so a
 * closed surface with shared vertices, which is what smooth normals need. `u × v` of a ring must point to the next
 * ring: that makes every face look outward. With `pivot` the part turns with the head about that point.
 */
export function loft(mesh: FigureMesh, rings: readonly Ring[], segments: number, pivot?: P3): void {
  const base = mesh.positions.length / 3;
  // A polygon of few sides is drawn larger, so it covers the area of its ellipse: far limbs do not go thin.
  const grow = Math.sqrt(Math.PI / ((segments / 2) * Math.sin((2 * Math.PI) / segments)));
  for (const { c, u, v, surface } of rings) {
    for (let k = 0; k < segments; k++) {
      const a = (k / segments) * Math.PI * 2;
      const [mask, reach, shade = 1] = surface(a);
      const [x, y] = [Math.cos(a) * reach * grow, Math.sin(a) * reach * grow];
      mesh.positions.push(c[0] + x * u[0] + y * v[0], c[1] + x * u[1] + y * v[1], c[2] + x * u[2] + y * v[2]);
      mesh.parts.push(mask, shade);
      mesh.heads.push(...(pivot ?? [0, 0, 0]), pivot ? 1 : 0);
    }
  }
  const at = (ring: number, k: number): number => base + ring * segments + (k % segments);
  for (let ring = 0; ring + 1 < rings.length; ring++) {
    for (let k = 0; k < segments; k++) {
      mesh.index.push(at(ring, k), at(ring, k + 1), at(ring + 1, k + 1));
      mesh.index.push(at(ring, k), at(ring + 1, k + 1), at(ring + 1, k));
    }
  }
  const last = rings.length - 1;
  for (let k = 1; k + 1 < segments; k++) {
    mesh.index.push(at(0, 0), at(0, k + 1), at(0, k), at(last, 0), at(last, k), at(last, k + 1));
  }
}
