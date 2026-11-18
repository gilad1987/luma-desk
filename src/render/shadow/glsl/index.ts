/**
 * The shaders of the shadow atlas. They live next to their owner and not in `src/render/shaders/index.ts`: that
 * file is the built-in stages' shader set, whose text the baselines pin.
 */
import shadowTile from './shadowTile.glsl?raw';

export { default as depthVertexShader } from './depth.vert.glsl?raw';
export { default as depthFragmentShader } from './depth.frag.glsl?raw';
export { default as viewVertexShader } from './view.vert.glsl?raw';
export { default as viewFragmentShader } from './view.frag.glsl?raw';

/** The GLSL of `beamShadow` for a shader that samples an atlas of `tiles` tiles. */
export const shadowTileChunk = (tiles: number): string => `#define SHADOW_TILES ${tiles}\n${shadowTile}`;
