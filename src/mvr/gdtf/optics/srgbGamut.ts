/** A chromaticity: CIE 1931 x, y or CIE 1976 u', v'. */
type Point = readonly [number, number];

/** CIE 1931 xy to CIE 1976 u'v': u' = 4x / (-2x + 12y + 3), v' = 9y / (-2x + 12y + 3). */
function toUv([x, y]: Point): Point {
  const d = -2 * x + 12 * y + 3;
  return [(4 * x) / d, (9 * y) / d];
}

/** CIE 1976 u'v' to CIE 1931 xy: x = 9u' / (6u' - 16v' + 12), y = 4v' / (6u' - 16v' + 12). */
function toXy([u, v]: Point): Point {
  const d = 6 * u - 16 * v + 12;
  return [(9 * u) / d, (4 * v) / d];
}

/** The sRGB primaries of IEC 61966-2-1 (xy R 0.64, 0.33; G 0.30, 0.60; B 0.15, 0.06) in u'v', counter-clockwise. */
const PRIMARIES: readonly Point[] = [toUv([0.64, 0.33]), toUv([0.3, 0.6]), toUv([0.15, 0.06])];
const EDGES = PRIMARIES.map((start, index) => [start, PRIMARIES[(index + 1) % PRIMARIES.length] ?? start] as const);

/** Twice the signed area of a, b, p: above 0 when p lies left of the line from a to b. */
const cross = (a: Point, b: Point, p: Point): number => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

/** The point of the segment a-b nearest to p. */
function nearestOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.min(1, Math.max(0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return [a[0] + t * dx, a[1] + t * dy];
}

const distance = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * The chromaticity `xy` moved into the sRGB gamut. A point inside the sRGB triangle stays as it is. A point outside
 * (a saturated LED or filter) moves to the nearest point of the triangle's edge in CIE 1976 u'v', a space in which
 * distance follows perceived colour difference far better than in xy: so an LED green stays a saturated green and
 * does not turn into a pale mint, as mixing it with grey would.
 */
export function intoSrgbGamut(xy: Point): Point {
  const uv = toUv(xy);
  if (EDGES.every(([a, b]) => cross(a, b, uv) >= 0)) return xy;
  const candidates = EDGES.map(([a, b]) => nearestOnSegment(uv, a, b));
  const nearest = candidates.reduce((best, point) => (distance(point, uv) < distance(best, uv) ? point : best));
  return toXy(nearest);
}
