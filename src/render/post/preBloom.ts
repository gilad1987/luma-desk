import type { Pass } from 'three/addons/postprocessing/Pass.js';
import { createBeamPass } from '../beams/createBeamPass';
import type { SurfaceLightContext } from '../lighting/BeamSource';
import { createSurfaceLightPass } from '../lighting/createSurfaceLightPass';
import { OcclusionPass, type OcclusionContext } from '../occlusion/OcclusionPass';

/** What a pass that adds light to the HDR scene gets from the chain: the render camera, the scene and its depth. */
export type PreBloomContext = SurfaceLightContext;

/**
 * The passes that add light to the HDR scene, in draw order. They run after the scene copy and before the bloom,
 * so their light glows and is tone mapped with the scene. Each pass adds to the read buffer (`needsSwap` false).
 * The light on the surfaces comes first: a shaft in the haze is in front of the pool it makes.
 */
export const PRE_BLOOM: readonly ((context: PreBloomContext) => Pass)[] = [createSurfaceLightPass, createBeamPass];

/**
 * Creates the passes between the scene copy and the bloom. The ambient occlusion is first: it shades the scene
 * colour, which is the hall light, before any fixture light is added, and the bounce of the surface light reads it.
 */
export function createPreBloom(context: OcclusionContext): Pass[] {
  const shade = new OcclusionPass(context);
  return [shade, ...PRE_BLOOM.map((create) => create({ ...context, occlusion: shade.texture }))];
}
