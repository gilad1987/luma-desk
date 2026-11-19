/*
 * The GLSL of the ambient occlusion of an MVR stage. Like the surface light it lives beside its pass and not in
 * `src/render/shaders`, the golden of the built-in stage programs. Every stage starts with the depth chunk of the
 * surface light and the chunk that reads and writes the occlusion image.
 */
import surface from '../../lighting/glsl/surface.glsl?raw';
import apply from './apply.frag.glsl?raw';
import blur from './blur.frag.glsl?raw';
import emitter from './emitter.frag.glsl?raw';
import measure from './occlusion.frag.glsl?raw';
import open from './open.glsl?raw';

/** Reads the occlusion at a depth pixel (`openAt`); the surface light adds it to its bounce program. */
export { default as openChunk } from './open.glsl?raw';
/** Measures the occlusion of one cell of 2 x 2 depth pixels. */
export const occlusionFragmentShader = [surface, open, measure].join('\n');
/** Averages the occlusion over its sample pattern, inside one surface. */
export const blurFragmentShader = [surface, open, blur].join('\n');
/** Places an unlit mesh for the emitter mask. */
export { default as emitterVertexShader } from './emitter.vert.glsl?raw';
/** Marks the pixels where an unlit mesh is the surface in the scene depth. */
export const emitterFragmentShader = [surface, emitter].join('\n');
/** Shades the scene colour of the hall light. */
export const applyFragmentShader = [surface, open, apply].join('\n');
