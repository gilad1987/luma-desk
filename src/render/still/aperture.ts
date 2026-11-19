import { halton } from './halton';

/** One lens point for depth of field: how a source moves and shears its camera for one sample. */
export interface LensSample {
  /** The camera moves by this much in its own x/y plane, in world units. */
  readonly offsetX: number;
  readonly offsetY: number;
  /** The view direction shears by this slope (x/z, y/z), so points on the focus plane do not move. */
  readonly shearX: number;
  readonly shearY: number;
}

/** Shirley's concentric map from the square to the unit disc; it keeps evenly spread points evenly spread. */
function concentricDisc(u: number, v: number): [number, number] {
  const a = 2 * u - 1;
  const b = 2 * v - 1;
  if (a === 0 && b === 0) return [0, 0];
  const [r, phi] =
    Math.abs(a) > Math.abs(b) ? [a, (Math.PI / 4) * (b / a)] : [b, Math.PI / 2 - (Math.PI / 4) * (a / b)];
  return [r * Math.cos(phi), r * Math.sin(phi)];
}

/**
 * The aperture point of sample `sample` on a round lens of `radius` (world units) focused at `focusDistance`. The
 * points come from Halton(5,7), independent of the pixel jitter. A radius of 0 is a pinhole: every value is 0. This
 * gives the parameters only; a source applies them to its camera, and the core renders nothing with them.
 */
export function aperturePoint(sample: number, radius: number, focusDistance: number): LensSample {
  const [x, y] = concentricDisc(halton(sample + 1, 5), halton(sample + 1, 7));
  const offsetX = x * radius;
  const offsetY = y * radius;
  // the ray from the moved eye must still meet the focus plane at the same point: slope = -offset / focus
  return { offsetX, offsetY, shearX: -offsetX / focusDistance, shearY: -offsetY / focusDistance };
}
