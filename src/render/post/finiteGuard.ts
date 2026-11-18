import { GLSL3, type GLSLVersion } from 'three';

/** The read of the pass input in the three.js shaders the chain guards: the copy, the bright pass and the output. */
const INPUT_READ = 'texture2D( tDiffuse, vUv )';

const channel = (name: string): string => `\t\tisnan( c.${name} ) || isinf( c.${name} ) ? 0.0 : c.${name}`;

/**
 * A colour with every NaN or infinite channel replaced by 0 (GLSL ES 3.00). A select per channel, not a `mix` by a
 * number: a product with NaN is NaN again.
 */
export const FINITE_GLSL = [
  'vec4 finiteOrZero( vec4 c ) {',
  '\treturn vec4(',
  ['r', 'g', 'b', 'a'].map(channel).join(',\n'),
  '\t);',
  '}',
].join('\n');

/** The mirror of `FINITE_GLSL` for one channel. */
export function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Wraps every read of the pass input in `finiteOrZero`. A blur spreads one NaN pixel over all it touches, and the
 * bloom blurs down to a few pixels, so one bad pixel of the scene (a broken normal, a division in a light pass) made
 * the whole frame black. The guard runs inside passes the chain has anyway: two tests per channel, no extra pass. A
 * shader without the read comes back unchanged; the unit test holds the three.js shaders to the read.
 */
export function withFiniteGuard(fragmentShader: string): string {
  if (!fragmentShader.includes(INPUT_READ)) return fragmentShader;
  const guarded = fragmentShader.split(INPUT_READ).join(`finiteOrZero( ${INPUT_READ} )`);
  const main = guarded.indexOf('void main()');
  return `${guarded.slice(0, main)}${FINITE_GLSL}\n${guarded.slice(main)}`;
}

/** What three.js puts before a shader it compiles as GLSL ES 3.00, so a shader in the old words still compiles. */
const VERTEX_300 = '#define attribute in\n#define varying out\n';
const FRAGMENT_300 = [
  '#define varying in',
  'layout(location = 0) out highp vec4 pc_fragColor;',
  '#define gl_FragColor pc_fragColor',
  '#define texture2D texture',
  '',
].join('\n');

/** The fields of a raw material that decide its shader language. */
interface RawStages {
  glslVersion: GLSLVersion | null;
  vertexShader: string;
  fragmentShader: string;
}

/**
 * Makes a raw material compile as GLSL ES 3.00. three.js leaves a raw material in GLSL ES 1.00, which has no `isnan`
 * and no `isinf`: the guarded output pass then did not compile and every frame was black. The lines are the ones
 * three.js adds to its other materials, so the stages keep their text and their arithmetic.
 */
export function toGlsl3(material: RawStages): void {
  material.glslVersion = GLSL3;
  material.vertexShader = `${VERTEX_300}${material.vertexShader}`;
  material.fragmentShader = `${FRAGMENT_300}${material.fragmentShader}`;
}

/** Puts the guard in the fragment stage of a pass material that has not been compiled yet. */
export function guardFinite(material: { fragmentShader: string }): void {
  material.fragmentShader = withFiniteGuard(material.fragmentShader);
}
