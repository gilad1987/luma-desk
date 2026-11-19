import { ISOTROPIC_PHASE, twoLobePhase, type TwoLobe } from '../photometry';

/**
 * The lobes of the haze in the shafts, for `twoLobePhase` of the photometry core: the shader and the core are one
 * normalised function, so the lobes only say where the scattered light goes and the density says how much there is.
 *
 * One forward lobe of g 0.35. Assumed, not measured: the droplets of an oil haze are well under a micrometre (size
 * parameter 1 to 2.5), where Mie theory gives a mean cosine of 0.2 to 0.5; the 0.8 of `HAZE_LOBES` is a fog of
 * droplets near 1 micrometre. The choice was made on the numbers of the drawn picture. The haze is lifted over a
 * physical one (`HAZE_LIFT`), and a lobe of 0.8 sends 40 times the even level straight at the eye: a camera on stage
 * that looks into the front light is then in a white veil. 0.35 gives 3.2 at the eye, 0.74 from the side and 0.36
 * from behind the lamp, so a beam that points at the viewer is still the brightest, and the key seen along its
 * beams from FOH stays under the shafts seen from the side.
 */
export const SHAFT_LOBES: TwoLobe = { forward: 0.35, back: 0, forwardWeight: 1 };

/**
 * The phase of the shafts as the shader has it: `twoLobePhase` times 4 pi, so an even scatter is 1 and the mean
 * over the sphere is 1.
 *
 * @param mu cosine of the angle between the direction of the light and the direction to the eye
 */
export function shaftPhase(mu: number): number {
  return twoLobePhase(mu, SHAFT_LOBES) / ISOTROPIC_PHASE;
}

const glsl = (value: number): string => value.toFixed(4);

/** The lobes as GLSL constants; the beam shader has no number of its own for them. */
export const phaseConstants = [
  `const float G_FORWARD = ${glsl(SHAFT_LOBES.forward)};`,
  `const float G_BACK = ${glsl(SHAFT_LOBES.back)};`,
  `const float W_FORWARD = ${glsl(SHAFT_LOBES.forwardWeight)};`,
].join('\n');
