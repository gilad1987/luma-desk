import { DoubleSide, GLSL3, ShaderMaterial } from 'three';
import { depthFragmentShader, depthVertexShader } from './glsl';

/**
 * Depth bias in texels of slope. The casters are drawn with both faces: scenery from 3DS and glTF files has open
 * sheets (drapes, truss plates) and mixed winding, so drawing only back faces would lose casters. With front faces
 * in the map, a lit surface compares against itself; this term and the sampler's bias in metres keep it lit.
 */
const SLOPE = 1.5;

/** The one material of every caster. `invRange` (1 / range of the beam) scales view depth to the atlas depth. */
export function createDepthMaterial(invRange: { value: number }): ShaderMaterial {
  return new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: depthVertexShader,
    fragmentShader: depthFragmentShader,
    uniforms: { uInvRange: invRange, uSlope: { value: SLOPE } },
    side: DoubleSide,
    // only the depth is used; the colour texture of the target exists because three.js needs one
    colorWrite: false,
  });
}
