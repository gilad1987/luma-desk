import { LED_CONTENT_PEAK, LED_FIELDS_GLSL } from './ledContent';

/**
 * The generated content looks. All are abstract and made by the desk: no picture, no logo, no text. `fields` is slow
 * soft colour fields, `bars` is slow vertical light bars that breathe and travel, `bokeh` is a low-contrast field of
 * soft discs at three depths. They share the palette and stay below `LED_CONTENT_PEAK`, as show content does. `w` is
 * the wall point in metres, so a look runs across a whole wall, and `t` is the content time in seconds.
 */
export const LED_LOOKS_GLSL = /* glsl */ `
uniform float uLedLook;
#define LED_PEAK ${LED_CONTENT_PEAK}
${LED_FIELDS_GLSL}
float ledHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
vec3 ledBars(vec2 w, float t) {
  float x = w.x / 0.75;
  float id = floor(x);
  // the edge is as soft as a screen pixel at least, so a far wall of bars does not shimmer
  float soft = max(fwidth(x), 0.05);
  float bar = 1.0 - smoothstep(0.3 - soft, 0.3 + soft, abs(fract(x) - 0.5));
  float rate = 0.12 + 0.2 * ledHash(vec2(id, 1.0));
  float breath = 0.5 + 0.5 * sin(t * rate * 2.0 + 6.283 * ledHash(vec2(id, 2.0)));
  float travel = 0.5 + 0.5 * sin(w.y * 0.6 - t * rate * 3.0 + 6.283 * ledHash(vec2(id, 3.0)));
  vec3 colour = mix(uLedPalette[0], uLedPalette[1], ledHash(vec2(id, 4.0)));
  colour = mix(colour, uLedPalette[2], 0.5 * travel * travel);
  return colour * (LED_PEAK * bar * (0.12 + 0.88 * breath * breath) * (0.35 + 0.65 * travel));
}
float ledDiscs(vec2 w, float cell, float t, float seed) {
  vec2 g = w / cell;
  vec2 id = floor(g) + seed;
  float turn = 6.283 * ledHash(id);
  // drift and radius keep a disc inside its cell, so no disc is cut at a cell edge
  vec2 drift = 0.12 * vec2(sin(t * 0.13 + turn), cos(t * 0.11 + 1.7 * turn));
  float radius = 0.14 + 0.19 * ledHash(id + 9.0);
  float pulse = 0.5 + 0.5 * sin(t * (0.15 + 0.2 * ledHash(id + 5.0)) + turn);
  return (1.0 - smoothstep(0.45 * radius, radius, length(fract(g) - 0.5 - drift))) * (0.25 + 0.75 * pulse);
}
vec3 ledBokeh(vec2 w, float t) {
  vec3 colour = 0.12 * mix(uLedPalette[0], uLedPalette[1], 0.5 + 0.5 * sin(w.x * 0.2 + t * 0.05));
  colour += 0.6 * uLedPalette[0] * ledDiscs(w - 1.3, 3.1, 0.6 * t, 67.0);
  colour += 0.5 * uLedPalette[1] * ledDiscs(w + 3.7, 1.9, 0.8 * t, 31.0);
  colour += 0.55 * uLedPalette[2] * ledDiscs(w, 1.1, t, 0.0);
  return min(colour, vec3(1.0)) * LED_PEAK;
}
vec3 ledContent(vec2 w, float t) {
  if (uLedLook > 1.5) return ledBokeh(w, t);
  if (uLedLook > 0.5) return ledBars(w, t);
  return ledFields(w, t);
}
`;
