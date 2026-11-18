/*
 * The GLSL of the volumetric beams. It lives here and not in `src/render/shaders`, because that module is the
 * golden of the built-in stage programs. The fragment stage is four files and the phase lobes of `hazePhase.ts`,
 * joined in the order of their use.
 */
import { phaseConstants } from '../hazePhase';
import cone from './cone.glsl?raw';
import head from './beam.head.glsl?raw';
import main from './beam.frag.glsl?raw';
import scatter from './scatter.glsl?raw';

/** Places the box of one beam from its instance row and hands the beam to the fragment stage. */
export { default as beamVertexShader } from './beam.vert.glsl?raw';
/** Marches the view ray through the cone of one beam and returns the light the haze scatters to the eye. */
export const beamFragmentShader = [head, phaseConstants, cone, scatter, main].join('\n');
/** The full-screen triangle of the upsample. */
export { default as quadVertexShader } from './quad.vert.glsl?raw';
/** Adds the half-resolution beam target to the scene, weighted by the scene depth. */
export { default as upsampleFragmentShader } from './upsample.frag.glsl?raw';
