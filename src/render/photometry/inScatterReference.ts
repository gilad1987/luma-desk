import type { Vec3Tuple } from '../../core';
import { coneIrradiance, type ConeSource } from './coneIrradiance';
import { finiteOr } from './finite';
import { transmittance, type HazeMedium } from './hazeMedium';
import { inScatterIntegrand } from './inScatter';
import { nits, type Nits } from './units';
import { addScaled, dot } from './vec3';

/** Steps of the reference integrator: enough for 0.1 % on a smooth beam; a hard-edged beam needs the same or more. */
export const REFERENCE_STEPS = 2048;

/** The part of a line of sight to integrate. */
export interface ViewRay {
  /** The camera position, metres. */
  readonly origin: Vec3Tuple;
  /** The view direction, a unit vector. */
  readonly direction: Vec3Tuple;
  /** How far to integrate, metres (to the first surface the ray hits). */
  readonly length: number;
}

/** The haze with the phase function to use, as a function of the cosine of the scattering angle. */
export interface ScatterMedium extends HazeMedium {
  readonly phase: (mu: number) => number;
}

/**
 * The radiance the haze scatters from one beam toward the camera along a view ray:
 * L = integral_0^length sigma_s p(mu) E(x) T_view(x) dt, by the midpoint rule with equal steps.
 *
 * It is the reference, not the fast path: tests and shader probes compare the few steps of the real-time pass (and
 * its closed forms) against it. It is single scattering: light scattered twice is not counted, which is right for a
 * visibility of tens of metres and too dark for dense fog.
 *
 * @param steps number of equal steps along the ray; a count that is not finite reads as `REFERENCE_STEPS`
 * @returns nits added to the pixel by this beam; 0 for a ray of a length that is not finite
 */
export function inScatteredRadiance(
  source: ConeSource,
  ray: ViewRay,
  medium: ScatterMedium,
  steps = REFERENCE_STEPS,
): Nits {
  const count = Math.max(1, Math.floor(Number.isFinite(steps) ? steps : REFERENCE_STEPS));
  const step = Math.max(ray.length, 0) / count;
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) * step;
    const light = coneIrradiance(source, addScaled(ray.origin, ray.direction, t), medium.sigmaT);
    if (light.irradiance <= 0) continue;
    // the light travels along `travel` and must leave toward the camera, against the view direction
    const mu = -dot(light.travel, ray.direction);
    sum += inScatterIntegrand(medium.sigmaS, medium.phase(mu), light.irradiance, transmittance(medium.sigmaT, t));
  }
  return nits(finiteOr(sum * step, 0));
}
