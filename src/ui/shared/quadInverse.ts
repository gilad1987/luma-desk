/** A point in client pixels. */
export type Point = readonly [x: number, y: number];

/** The four projected corners of a box, clockwise from the top left. */
export type Quad = readonly [topLeft: Point, topRight: Point, bottomRight: Point, bottomLeft: Point];

/**
 * The inverse of the square-to-quad homography: client pixels back to 0..1 box coordinates. It returns null when
 * the quad is degenerate (zero size or collapsed), so the caller can fall back to the bounding rectangle.
 */
export function quadInverse(quad: Quad): ((x: number, y: number) => Point) | null {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const dx1 = x1 - x2,
    dx2 = x3 - x2,
    dx3 = x0 - x1 + x2 - x3,
    dy1 = y1 - y2,
    dy2 = y3 - y2,
    dy3 = y0 - y1 + y2 - y3,
    den = dx1 * dy2 - dx2 * dy1;
  if (!den || !Number.isFinite(den)) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / den,
    k = (dx1 * dy3 - dx3 * dy1) / den,
    a = x1 - x0 + g * x1,
    b = x3 - x0 + k * x3,
    d = y1 - y0 + g * y1,
    e = y3 - y0 + k * y3;
  const A = e - y0 * k,
    B = x0 * k - b,
    C = b * y0 - x0 * e,
    D = y0 * g - d,
    E = a - x0 * g,
    F = x0 * d - a * y0,
    G = d * k - e * g,
    H = b * g - a * k,
    I = a * e - b * d;
  return (x, y) => {
    const q = G * x + H * y + I;
    return [(A * x + B * y + C) / q, (D * x + E * y + F) / q];
  };
}
