import type { Vec3Tuple } from '../../core';
import { finiteOr } from './finite';
import { nits, type Lux, type Nits } from './units';
import { dot, subtract } from './vec3';

/** The smallest ray to apex distance the closed form uses, in metres: at 0 it would divide by 0. */
const MIN_HEIGHT = 1e-6;

/** Where a view ray passes a point: the two numbers of the closed form. Both in metres. */
export interface RayApex {
  /** h: the shortest distance from the point to the line of the ray. */
  readonly height: number;
  /** b: t + b is the position along the ray measured from the foot of that shortest distance. */
  readonly offset: number;
}

/**
 * h and b for a ray `origin + t direction` and a point (the apex of a beam): the distance from the apex to the
 * position t on the ray is then sqrt(h^2 + (t + b)^2).
 *
 * @param direction unit vector
 * @returns 0 for a value that comes out NaN or infinite (a ray or an apex that is not finite)
 */
export function rayApex(origin: Vec3Tuple, direction: Vec3Tuple, apex: Vec3Tuple): RayApex {
  const fromApex = subtract(origin, apex);
  const offset = dot(fromApex, direction);
  const height = Math.sqrt(Math.max(dot(fromApex, fromApex) - offset * offset, 0));
  return { height: finiteOr(height, 0), offset: finiteOr(offset, 0) };
}

/**
 * The inverse square part of the in-scatter integral in closed form:
 * integral from t0 to t1 of dt / (h^2 + (t + b)^2) = (1 / h) [atan((t1 + b) / h) - atan((t0 + b) / h)].
 * Source: the standard integral of 1 / (h^2 + u^2); the "airlight" integral of a point light in a uniform medium.
 *
 * The two arc tangents are folded into one `atan2` (atan p - atan q = atan2(p - q, 1 + p q)): the difference of two
 * values near pi / 2 loses its digits when the ray passes close to the apex.
 *
 * @param h shortest distance from the apex to the ray, metres; below 1 micrometre it reads as that
 * @param b offset of the ray parameter, metres (see `rayApex`)
 * @param t0 start of the part of the ray inside the beam, metres
 * @param t1 end of that part, metres
 * @returns per metre; times sigma_s p I0 it is the radiance of a beam with no falloff and no extinction. An
 *   infinite end gives the finite limit (atan of +-Infinity is +-pi / 2: pi / h for the whole line); a NaN gives 0,
 *   and so does an infinite h (the limit)
 */
export function inverseSquareIntegral(h: number, b: number, t0: number, t1: number): number {
  const height = Math.max(Math.abs(h), MIN_HEIGHT);
  const from = t0 + b;
  const to = t1 + b;
  if (Number.isNaN(height) || Number.isNaN(from) || Number.isNaN(to) || height === Infinity) return 0;
  if (!Number.isFinite(from) || !Number.isFinite(to))
    return (Math.atan(to / height) - Math.atan(from / height)) / height;
  return Math.atan2(height * (to - from), height * height + from * to) / height;
}

/**
 * The integrand of the in-scattered radiance, L = integral of sigma_s p(mu) E(x) T(x) dx: what one metre of the
 * view ray adds. Source: the single scattering term of the volume rendering equation.
 *
 * @param sigmaS scattering per metre
 * @param phase the phase function at the scattering angle, per steradian
 * @param irradiance lux at the point on a plane that faces the lamp, after the extinction on the way from the lamp
 * @param viewTransmittance the fraction that reaches the camera from the point, 0..1
 * @returns nits per metre of view ray
 */
export function inScatterIntegrand(sigmaS: number, phase: number, irradiance: Lux, viewTransmittance: number): Nits {
  return nits(finiteOr(sigmaS * phase * irradiance * viewTransmittance, 0));
}
