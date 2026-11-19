import { toBufferUnits } from './mvrTone';

/**
 * The bound of the body of a lens cell in the HDR model, in exposure-adjusted units where the white of a lit
 * surface is 1: a full cell is a bright face inside the bloom knee and not a clipped white, so the ribs and rings
 * between the cells still read as darker.
 */
export const CELL_CAP = 2.4;
/** The body of a cell follows the face texel to this power: a ring at 0.4 keeps 6 % where a cell at 0.7 keeps 34 %. */
export const BODY_POWER = 3;
/** The hot core follows the texel to this power, so only the brightest part of each cell carries it. */
export const CORE_POWER = 12;
/** The highest core factor: a face with almost no bright texel must not put all its light into one of them. */
export const CORE_LIMIT = 64;

/** The means of a lens face texel t (linear, 0..1) over the face: of t, of t^BODY_POWER and of t^CORE_POWER. */
export interface FaceMoments {
  readonly mean: number;
  readonly body: number;
  readonly core: number;
}

/** The two factors of the cell law for one lens at one level (`cellShape`). */
export interface CellShape {
  body: number;
  core: number;
}

/** The moments of a face from its linear texels; undefined for a face with no bright texel to carry a core. */
export function faceMoments(texels: ArrayLike<number>): FaceMoments | undefined {
  let mean = 0;
  let body = 0;
  let core = 0;
  for (let i = 0; i < texels.length; i++) {
    const t = texels[i] ?? 0;
    mean += t;
    body += t ** BODY_POWER;
    core += t ** CORE_POWER;
  }
  if (!(core > 0)) return undefined;
  return { mean: mean / texels.length, body: body / texels.length, core: core / texels.length };
}

/**
 * The radiance bound per texel of a lens face. `flat` is what one bound per material gives a white texel
 * (`boundedLensGain` times the peak, buffer units). The flat law is `flat * t` for a texel t: at full every texel
 * over 0.1 is past white and the face has no pattern. The cell law is `flat * (body * t^3 + core * t^12)`: the body
 * bends to `CELL_CAP`, and the core takes the rest, so that the mean over the face is the mean of the flat law.
 * The disc then feeds the bloom the light it fed before, from the cores and not from the ribs. Writes to `out`.
 */
export function cellShape(flat: number, moments: FaceMoments, out: CellShape): CellShape {
  if (!(flat > 0)) {
    out.body = out.core = 0;
    return out;
  }
  const cap = toBufferUnits(CELL_CAP);
  out.body = (cap * (1 - Math.exp(-flat / cap))) / flat;
  out.core = Math.min((moments.mean - out.body * moments.body) / moments.core, CORE_LIMIT);
  return out;
}

/** The radiance of a texel under the cell law; the mirror of `lens/lensCells.glsl`, for tests and measurements. */
export function cellRadiance(texel: number, flat: number, shape: Readonly<CellShape>): number {
  return flat * (shape.body * texel ** BODY_POWER + shape.core * texel ** CORE_POWER);
}
