import { LED_LOOKS_GLSL } from './ledLooksGlsl';

/** Declarations for the vertex stage. A proxy panel brings its wall coordinates as instance attributes. */
export const LED_VERTEX_PARS = /* glsl */ `
varying vec3 vLedWorld;
#ifdef LED_PROXY
attribute vec4 ledWall; // wall u and v of the panel centre (m), panel size (m), wall index
attribute vec4 ledAxes; // wall u, then wall v, per metre of local x and z
attribute float ledSide; // +1 when the local +y face is the front of the wall, -1 when the other face is
varying vec2 vLedTile;
varying vec2 vLedUv;
varying float vLedPitch;
varying float vLedFace;
#endif
`;

/** After `begin_vertex`: the world position, and for a proxy the place in its tile and on its wall. */
export const LED_VERTEX = /* glsl */ `
vec4 ledWorld = vec4(position, 1.0);
#ifdef USE_INSTANCING
ledWorld = instanceMatrix * ledWorld;
#endif
vLedWorld = (modelMatrix * ledWorld).xyz;
#ifdef LED_PROXY
vec2 ledLocal = position.xz * ledWall.z;
vLedTile = ledLocal + 0.5 * ledWall.z;
vLedUv = ledWall.xy + vec2(dot(ledAxes.xy, ledLocal), dot(ledAxes.zw, ledLocal)) + ledWall.w * vec2(17.0, 5.3);
vLedPitch = ledWall.z;
vLedFace = max(0.0, normal.y * ledSide);
#endif
`;

/**
 * Declarations for the fragment stage. `ledDots` is the LED dot on its black mask; the dot gain keeps the mean level
 * of a tile the same near and far (a dot of radius 0.3 covers 28 % of its cell). The pattern fades to that mean as a
 * cell nears the size of a screen pixel, measured by the screen-space derivative, so a far wall has no moire.
 * `ledSeam` is the hairline gap between modules, drawn by its coverage of the pixel, so it also fades with distance.
 */
export const LED_FRAGMENT_PARS = /* glsl */ `
uniform float uLedLevel;
uniform float uLedTime;
uniform float uLedPitch;
uniform vec3 uLedFront;
varying vec3 vLedWorld;
#ifdef LED_PROXY
varying vec2 vLedTile;
varying vec2 vLedUv;
varying float vLedPitch;
varying float vLedFace;
#endif
#define LED_MODULE 0.5
#define LED_SEAM 0.0015
#define LED_DOT_GAIN 3.537
${LED_LOOKS_GLSL}
float ledDots(vec2 metres) {
  vec2 cell = metres / uLedPitch;
  float width = max(fwidth(cell.x), fwidth(cell.y));
  float dots = 1.0 - smoothstep(0.3 - width, 0.3 + width, length(fract(cell) - 0.5));
  return mix(dots * LED_DOT_GAIN, 1.0, smoothstep(0.12, 0.4, width));
}
float ledSeam(vec2 tile, float module) {
  vec2 edge = abs(fract(tile / module + 0.5) - 0.5) * module;
  vec2 width = max(fwidth(tile), vec2(1e-6));
  vec2 gap = (1.0 - smoothstep(vec2(0.0), max(width, vec2(LED_SEAM)), edge)) * min(vec2(1.0), LED_SEAM / width);
  return (1.0 - gap.x) * (1.0 - gap.y);
}
`;

/**
 * After `emissivemap_fragment`: the emission of the wall. A proxy uses its tile and wall coordinates; a mesh from the
 * file has none, so it takes metres along its own plane from the world position (no seams: the file does not say
 * where its modules meet). With a front (`uLedFront`, a marked layer) only faces within 60 degrees of it emit and the
 * front is the one mapping axis of the wall; without one every face emits and maps by its own normal.
 * LEDs dim off axis, about cos^1.5. An image from the file arrives as the emissive map.
 */
export const LED_FRAGMENT = /* glsl */ `
#ifdef LED_PROXY
vec2 ledTile = vLedTile;
vec2 ledUv = vLedUv;
float ledModule = vLedPitch / max(1.0, floor(vLedPitch / LED_MODULE + 0.5));
float ledFace = step(0.5, vLedFace) * ledSeam(ledTile, ledModule);
#else
vec3 ledNormal = inverseTransformDirection(normal, viewMatrix);
bool ledFronted = dot(uLedFront, uLedFront) > 0.5;
vec3 ledAxis = ledFronted ? uLedFront : ledNormal;
bool ledLevelFace = abs(ledAxis.y) > 0.9;
vec2 ledAlong = ledLevelFace ? vec2(1.0, 0.0) : normalize(vec2(ledAxis.z, -ledAxis.x));
vec2 ledTile = ledLevelFace ? vLedWorld.xz : vec2(dot(vLedWorld.xz, ledAlong), vLedWorld.y);
vec2 ledUv = ledTile;
float ledFace = ledFronted ? step(0.5, dot(ledNormal, uLedFront)) : 1.0;
#endif
float ledAngle = pow(clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 1.5);
#ifdef USE_EMISSIVEMAP
vec3 ledImage = totalEmissiveRadiance;
#else
vec3 ledImage = ledContent(ledUv, uLedTime);
#endif
totalEmissiveRadiance = ledImage * (uLedLevel * ledDots(ledTile) * ledFace * ledAngle);
`;
