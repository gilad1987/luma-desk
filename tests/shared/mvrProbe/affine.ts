export type Vec3 = readonly [number, number, number];

/**
 * An MVR placement as the spec writes it, `{u}{v}{w}{o}`: the images of the X, Y and Z axes and of the origin, in mm,
 * right-handed and Z up. A point p maps to p.x·u + p.y·v + p.z·w + o. Kept in the file's own frame: the probe never
 * converts to the app's metres or Y up, so a conversion bug in the app cannot hide in a shared conversion.
 */
export interface Affine {
  u: Vec3;
  v: Vec3;
  w: Vec3;
  o: Vec3;
}

export const IDENTITY: Affine = { u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1], o: [0, 0, 0] };

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

/** The rotation part of `m` applied to direction `d`. */
export const turn = (m: Affine, d: Vec3): Vec3 => add(add(scale(m.u, d[0]), scale(m.v, d[1])), scale(m.w, d[2]));

/** Point `p` placed by `m`. */
export const place = (m: Affine, p: Vec3): Vec3 => add(turn(m, p), m.o);

/** `parent` after `child`: what the spec means by a child's matrix being relative to its parent. */
export function compose(parent: Affine, child: Affine): Affine {
  return { u: turn(parent, child.u), v: turn(parent, child.v), w: turn(parent, child.w), o: place(parent, child.o) };
}

/** Reads `{a,b,c}{d,e,f}{g,h,i}{x,y,z}`; anything that is not four triples of numbers gives `undefined`. */
export function parseMatrix(text: string): Affine | undefined {
  const groups = [...text.matchAll(/\{([^}]*)\}/g)].map(([, inner]) =>
    (inner ?? '').split(',').map((s) => Number(s.trim())),
  );
  if (groups.length !== 4 || groups.some((g) => g.length !== 3 || g.some((n) => !Number.isFinite(n)))) return undefined;
  const [u, v, w, o] = groups.map((g): Vec3 => [g[0] ?? 0, g[1] ?? 0, g[2] ?? 0]);
  return u && v && w && o ? { u, v, w, o } : undefined;
}

/** Determinant of the rotation part: -1 for a mirrored placement. */
export function determinant({ u, v, w }: Affine): number {
  return u[0] * (v[1] * w[2] - v[2] * w[1]) - v[0] * (u[1] * w[2] - u[2] * w[1]) + w[0] * (u[1] * v[2] - u[2] * v[1]);
}
