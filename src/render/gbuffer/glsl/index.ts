/*
 * The GLSL of the surface buffers of an MVR stage. It lives here and not in `src/render/shaders`, because that
 * module is the golden of the built-in stage programs.
 */

/** Places one opaque mesh (instanced or not) and hands its world normal to the fragment stage. */
export { default as surfaceVertexShader } from './surface.vert.glsl?raw';
/** Writes world normal and metalness to the first buffer, base colour and roughness to the second. */
export { default as surfaceFragmentShader } from './surface.frag.glsl?raw';
/** Writes "no mesh" to both buffers, with depth: a mesh that hides the surfaces behind it but is none itself. */
export { default as noDataFragmentShader } from './nodata.frag.glsl?raw';
