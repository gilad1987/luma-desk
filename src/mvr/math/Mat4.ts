/**
 * A 4x4 affine matrix of 16 numbers, column-major: row `r`, column `c` is at index `c * 4 + r`. That is the layout of
 * three.js `Matrix4.elements`, so later stages pass it on without a transpose. 64-bit floats, because MVR positions
 * are millimetres and a venue spans 10^5 mm. Treat values as immutable: every function here returns a new matrix.
 */
export type Mat4 = Float64Array;

/** One `{...}` group of an MVR matrix string. */
const GROUP = /\{([^{}]*)\}/g;

/** The matrix that changes nothing: the transform of an element without `<Matrix>`. */
export function identity(): Mat4 {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

/** Row `row`, column `col` of `m`; the `?? 0` only satisfies the index check, because a Mat4 always has 16 numbers. */
const at = (m: Mat4, row: number, col: number): number => m[col * 4 + row] ?? 0;

/**
 * The product `a · b`: applies `b` first, then `a`. A child's world matrix is `multiply(parentWorld, childLocal)`,
 * which is how the scene walk composes nested MVR groups.
 */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float64Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        at(a, row, 0) * at(b, 0, col) +
        at(a, row, 1) * at(b, 1, col) +
        at(a, row, 2) * at(b, 2, col) +
        at(a, row, 3) * at(b, 3, col);
    }
  }
  return out;
}

/** Three finite numbers separated by commas, or `undefined`; an empty part is rejected, as `Number('')` is 0. */
function parseTriple(text: string): number[] | undefined {
  const parts = text.split(',').map((part) => part.trim());
  if (parts.length !== 3 || parts.some((part) => part === '')) return undefined;
  const numbers = parts.map(Number);
  return numbers.every(Number.isFinite) ? numbers : undefined;
}

/**
 * Reads the text of an MVR `<Matrix>`: `{u}{v}{w}{o}`, where u, v and w are the basis columns and o is the
 * translation. Values stay in MVR's frame (millimetres, Z up, right-handed); conversion to the scene frame is a
 * separate step. Missing or blank text gives identity, as the spec says; text that does not parse gives `undefined`,
 * so the caller can warn about that object instead of silently placing it at the origin.
 */
export function readMvrMatrix(text: string | undefined): Mat4 | undefined {
  if (text === undefined || text.trim() === '') return identity();
  const groups = [...text.matchAll(GROUP)];
  if (groups.length !== 4) return undefined;
  const m = identity();
  for (const [col, group] of groups.entries()) {
    const column = parseTriple(group[1] ?? '');
    if (!column) return undefined;
    m.set(column, col * 4);
  }
  return m;
}

/** A point moved by `m` (rotation, scale and translation), for example a mesh box corner taken to world space. */
export function transformPoint(m: Mat4, [x, y, z]: readonly [number, number, number]): [number, number, number] {
  return [
    at(m, 0, 0) * x + at(m, 0, 1) * y + at(m, 0, 2) * z + at(m, 0, 3),
    at(m, 1, 0) * x + at(m, 1, 1) * y + at(m, 1, 2) * z + at(m, 1, 3),
    at(m, 2, 0) * x + at(m, 2, 1) * y + at(m, 2, 2) * z + at(m, 2, 3),
  ];
}

/**
 * A number as MVR text: 6 decimals (a micrometre, a micro-unit of rotation), no `-0`, no exponent, no trailing
 * zeros.
 */
function formatNumber(value: number): string {
  const rounded = Number(value.toFixed(6));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

/**
 * Writes `m` as the text of an MVR `<Matrix>`, `{u}{v}{w}{o}`, the exact inverse of `readMvrMatrix`. Fixed rounding
 * makes the text the same on every export of the same design, so exported files can be compared byte for byte.
 */
export function formatMvrMatrix(m: Mat4): string {
  const column = (col: number): string => `{${[0, 1, 2].map((row) => formatNumber(at(m, row, col))).join(',')}}`;
  return [0, 1, 2, 3].map(column).join('');
}
