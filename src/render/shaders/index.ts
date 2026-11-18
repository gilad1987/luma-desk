/*
 * The scene's GLSL sources, one named string per .glsl file. Each file holds exactly the text the pre-refactor
 * script passed to three.js, so the compiled programs (and the screenshot baselines) stay the same.
 */

/** Sky dome vertex stage: hands the unit view direction to the gradient. */
export { default as skyVertexShader } from './sky.vert.glsl?raw';
/** Sky dome fragment stage: night gradient with a warm glow at the horizon. */
export { default as skyFragmentShader } from './sky.frag.glsl?raw';

/**
 * Crowd bounce declarations. The file ends with a newline, so the caller prepends it to three's vertex shader
 * without adding one.
 */
export { default as crowdBounceParsChunk } from './crowdBounce.pars.glsl?raw';
/** Crowd bounce body: lifts each instance by its own phase and amplitude; goes after `#include <begin_vertex>`. */
export { default as crowdBounceVertexChunk } from './crowdBounce.vertex.glsl?raw';

/** LED wall vertex stage: passes the UV that the fragment stage turns into content and LED pixels. */
export { default as ledWallVertexShader } from './ledWall.vert.glsl?raw';
/** LED wall fragment stage: the eight `SCREEN_MODES` patterns, picked by `uMode`, under a LED pixel grid. */
export { default as ledWallFragmentShader } from './ledWall.frag.glsl?raw';

/** Beam cone vertex stage: cone depth, view vector and world position for the haze. */
export { default as beamVertexShader } from './beam.vert.glsl?raw';
/** Beam cone fragment stage: soft edges, procedural gobo breakup and moving haze noise. */
export { default as beamFragmentShader } from './beam.frag.glsl?raw';
