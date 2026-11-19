import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { toGlsl3, withFiniteGuard } from './finiteGuard';

/** One step of the 8-bit canvas; the dither spans plus and minus half of it. */
export const DITHER_STEP = 1 / 255;

/**
 * Interleaved gradient noise (Jimenez 2014) of the pixel, less its mean, times one 8-bit step. It is added in
 * display space, after the tone curve and the sRGB transfer, so the 8-bit write of the canvas rounds a dark gradient
 * (the fall-off of the haze, the fade of the hall floor) to two levels in a fine mix and not to bands. It is a
 * function of the pixel alone, with no clock: two frames of one look are the same image, bit for bit.
 */
export const DITHER_GLSL = [
  '\tfloat grain = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );',
  '\tgl_FragColor.rgb += ( grain - 0.5 ) / 255.0;',
].join('\n');

const fract = (value: number): number => value - Math.floor(value);

/** The mirror of `DITHER_GLSL` for the pixel whose centre is (x + 0.5, y + 0.5): what is added to each channel. */
export function ditherAt(x: number, y: number): number {
  const grain = fract(52.9829189 * fract((x + 0.5) * 0.06711056 + (y + 0.5) * 0.00583715));
  return (grain - 0.5) * DITHER_STEP;
}

/** Puts the dither at the end of a fragment stage that has written its display colour to `gl_FragColor`. */
export function withDither(fragmentShader: string): string {
  const end = fragmentShader.lastIndexOf('}');
  return `${fragmentShader.slice(0, end)}${DITHER_GLSL}\n}${fragmentShader.slice(end + 1)}`;
}

/**
 * The output pass of the MVR chain: three's tone mapping and sRGB transfer, then the dither. The pass writes to a
 * half-float buffer and the edge smoothing after it copies a pixel that is on no edge as it is, so the dither
 * reaches the 8-bit canvas where the bands were.
 */
export function createDitheredOutputPass(): OutputPass {
  const pass = new OutputPass();
  // the bloom adds to the frame it read, so a non-finite pixel of a light pass is still there: it becomes black
  pass.material.fragmentShader = withDither(withFiniteGuard(pass.material.fragmentShader));
  // the pass has a raw material, and the guard needs GLSL ES 3.00
  toGlsl3(pass.material);
  return pass;
}
