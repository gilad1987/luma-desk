/*
 * The GLSL of the surface light of an MVR stage. It lives here and not in `src/render/shaders`, because that module
 * is the golden of the built-in stage programs. Every fragment stage starts with the depth chunk.
 */
import { openChunk } from '../../occlusion/glsl';
import ambient from './ambient.frag.glsl?raw';
import light from './light.frag.glsl?raw';
import normal from './normal.frag.glsl?raw';
import surface from './surface.glsl?raw';

/** Places the box of one light volume from the instance row of its beam. */
export { default as lightVertexShader } from './light.vert.glsl?raw';
/** Adds the diffuse light of one fixture to the scenery inside its cone. */
export const lightFragmentShader = [surface, light].join('\n');
/** Rebuilds the world normal of the scenery from the scene depth. */
export const normalFragmentShader = [surface, normal].join('\n');
/** Adds the bounce of the lit stage to every surface, less where the ambient occlusion closes the surface in. */
export const ambientFragmentShader = [surface, openChunk, ambient].join('\n');
