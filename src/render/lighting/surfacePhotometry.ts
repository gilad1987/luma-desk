import type { Vector3 } from 'three';
import { peakIntensity } from '../beams/beamIntensity';
import { ROW } from '../beams/packBeam';
import { apexOffset, candela, illuminance } from '../photometry';

/**
 * Radiance of a lit white matt surface per unit of irradiance, in the units of the HDR scene target. It is the
 * exposure of the show light: a figure in one spot at full from a 10 m trim reads as lit, not burnt, and the deck
 * under the washes of a full look keeps their colour (the tone curve turns what clips to white).
 */
export const SURFACE_GAIN = 3;
/** The base colour of a surface with no material data (a mesh outside the surface buffers): a mid grey. */
export const NEUTRAL_ALBEDO = 0.2;
/**
 * The darkest base colour the light pass uses. No stage surface is darker: black paint and dance floor reflect
 * 4 to 10 % with the dust of a show, and a scenery look below that is tuned for the hall light, not measured.
 */
export const MIN_ALBEDO = 0.08;
/**
 * Metres a light without a shadow map goes on behind the point where its axis lands. The axis may land on a
 * figure, and the deck behind it is lit too; a longer way would light the hall through the deck.
 */
export const PAST_FIGURE = 3;
/** The radiance below which a light adds nothing the tone curve shows; the light volume ends there. */
export const CUT_LEVEL = 0.003;
/** The longest light volume in metres; a venue is not longer, and a volume costs its screen area. */
export const MAX_RANGE = 60;
/** The facing term of scenery too thin for a normal (a truss chord, a cable): the mean of a tube lit from a side. */
export const THIN_FACING = 0.32;
/** Bounce radiance on a white surface per unit of lit flux: a full rig lifts the hall a little, a blackout not. */
export const AMBIENT_GAIN = 3e-4;

/**
 * Metres from the lens back to the point where the rim lines of the cone meet: the cone starts as the lens disc.
 * `tan` is the tangent of the field half angle, as a beam row holds it. The shaders have it as lens radius over tan.
 */
export function apexDistance(lensRadius: number, tan: number): number {
  return apexOffset(lensRadius, Math.atan(tan));
}

/**
 * The radiance of a matt surface of base colour `albedo` that faces a light of this peak intensity from `distance`
 * metres off its lens. It is the law of the photometry core (`illuminance`): the peak over d^2 + a^2, with `apex`
 * the distance a from the virtual apex to the lens (`apexDistance`). The light shader has the same term
 * (`light.frag.glsl`), so the pool of a narrow beam is not brighter than its data sheet says.
 */
export function surfaceRadiance(peak: number, distance: number, apex: number, albedo = 1): number {
  return SURFACE_GAIN * albedo * illuminance(candela(peak), distance, 1, apex);
}

/** How far the light of this peak intensity is drawn: to where a facing surface falls below the cut level. */
export function lightRange(peak: number): number {
  return Math.min(Math.sqrt((SURFACE_GAIN * Math.max(peak, 0)) / CUT_LEVEL), MAX_RANGE);
}

/**
 * The summed flux of the first `count` beam rows, per colour channel, into `out`. A row holds colour times peak
 * intensity, and the peak is output over the solid angle of the cone, so the flux of a row does not depend on its
 * zoom: a narrow beam is a brighter and smaller pool of the same energy.
 */
export function litFlux(rows: Float32Array, count: number, out: Vector3): Vector3 {
  out.set(0, 0, 0);
  for (let i = 0; i < count; i++) {
    const at = i * ROW;
    const solidAngle = 1 / peakIntensity(rows[at + 7] ?? 0);
    out.x += (rows[at + 8] ?? 0) * solidAngle;
    out.y += (rows[at + 9] ?? 0) * solidAngle;
    out.z += (rows[at + 10] ?? 0) * solidAngle;
  }
  return out;
}
