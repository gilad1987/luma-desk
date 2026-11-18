/** Linear RGB. */
export type Rgb = readonly [number, number, number];

const smooth = (low: number, high: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

const mix = (a: Rgb, b: Rgb, k: number): Rgb => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];

const BLACK: Rgb = [0, 0, 0];

/**
 * The brightest the generated content gets, as a share of white. Show content is mostly far below white (a low
 * average picture level); a wall of near-white fields at any level reads as a light box and washes out the beams.
 */
export const LED_CONTENT_PEAK = 0.4;

/**
 * The generated content at wall point (`u`, `v`) in metres and time `t` in seconds: three slow sine fields pick
 * between the palette colours and a level. It is the same sum as `LED_CONTENT_GLSL` below, which draws it; this copy
 * gives the wall light its colour. Fields are 10 to 25 m wide and take about a minute to pass: soft, slow, no shape
 * that reads as a logo or as text.
 */
export function ledContentAt(u: number, v: number, t: number, palette: readonly Rgb[]): Rgb {
  const a = 0.5 + 0.25 * (Math.sin(u * 0.42 + t * 0.11) + Math.sin(v * 0.66 - t * 0.07 + 1.7));
  const b = 0.5 + 0.25 * (Math.sin((u + v) * 0.26 + t * 0.05 + 2.1) + Math.sin(u * 0.18 - v * 0.34 + t * 0.09));
  const l = 0.5 + 0.25 * (Math.sin(u * 0.34 - t * 0.13 + 0.6) + Math.sin(v * 0.54 + t * 0.06));
  const first = mix(palette[0] ?? BLACK, palette[1] ?? BLACK, smooth(0.25, 0.75, a));
  const colour = mix(first, palette[2] ?? BLACK, 0.7 * smooth(0.45, 0.9, b));
  const level = LED_CONTENT_PEAK * (0.3 + 0.7 * smooth(0.15, 0.85, l));
  return [colour[0] * level, colour[1] * level, colour[2] * level];
}

/** `ledContentAt` in GLSL, as the `fields` look; keep the two in step. */
export const LED_FIELDS_GLSL = /* glsl */ `
uniform vec3 uLedPalette[3];
vec3 ledFields(vec2 w, float t) {
  float a = 0.5 + 0.25 * (sin(w.x * 0.42 + t * 0.11) + sin(w.y * 0.66 - t * 0.07 + 1.7));
  float b = 0.5 + 0.25 * (sin((w.x + w.y) * 0.26 + t * 0.05 + 2.1) + sin(w.x * 0.18 - w.y * 0.34 + t * 0.09));
  float l = 0.5 + 0.25 * (sin(w.x * 0.34 - t * 0.13 + 0.6) + sin(w.y * 0.54 + t * 0.06));
  vec3 colour = mix(uLedPalette[0], uLedPalette[1], smoothstep(0.25, 0.75, a));
  colour = mix(colour, uLedPalette[2], 0.7 * smoothstep(0.45, 0.9, b));
  return colour * (${LED_CONTENT_PEAK} * (0.3 + 0.7 * smoothstep(0.15, 0.85, l)));
}
`;
