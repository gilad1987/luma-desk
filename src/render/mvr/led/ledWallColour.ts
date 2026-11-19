import { LED_CONTENT_PEAK, ledContentAt, type Rgb } from './ledContent';
import type { V3 } from './ledPose';
import { ledLook, ledUniforms } from './ledUniforms';

/** One wall as a light source, for a pass that lights surfaces from areas: stage frame, metres, linear radiance. */
export interface WallLight {
  readonly position: V3;
  readonly normal: V3;
  readonly width: number;
  readonly height: number;
  /** Mean radiance of the wall's content at its level, in the units of the HDR scene buffer. */
  readonly colour: Rgb;
}

/** The six places on a wall, in sixths of its width and quarters of its height, that stand for its content. */
const SAMPLES = [
  [1, 1],
  [3, 1],
  [5, 1],
  [1, 3],
  [3, 3],
  [5, 3],
] as const;

/** Mean level of the `bars` and `bokeh` looks, as a share of the palette mean: about what their fields sum to. */
const FLAT_MEAN = { bars: 0.18, bokeh: 0.2 } as const;

/**
 * Mean content colour of a wall now, times the wall level. For the colour fields: six samples of the same field the
 * shader draws; `seed` is the wall index, which moves each wall to its own part of the field, as the shader does.
 * Bars and bokeh are even across a wall, so their mean is the palette mean at the look's mean level. `origin` is
 * the wall coordinate of the wall's lower left corner, for a mesh wall, which the shader maps by its place.
 */
export function wallColour(wall: {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly origin?: readonly [number, number];
}): Rgb {
  const palette = ledUniforms.uLedPalette.value.map((colour): Rgb => [colour.r, colour.g, colour.b]);
  const look = ledLook();
  const [u0, v0] = wall.origin ?? [0, 0];
  let [r, g, b] = [0, 0, 0];
  for (const [x, y] of SAMPLES) {
    const u = u0 + (x / 6) * wall.width + wall.seed * 17;
    const v = v0 + (y / 4) * wall.height + wall.seed * 5.3;
    const colour = look === 'fields' ? ledContentAt(u, v, ledUniforms.uLedTime.value, palette) : flat(palette, look);
    [r, g, b] = [r + colour[0], g + colour[1], b + colour[2]];
  }
  const k = ledUniforms.uLedLevel.value / SAMPLES.length;
  return [r * k, g * k, b * k];
}

/** The palette mean at the mean level of an even look. */
function flat(palette: readonly Rgb[], look: 'bars' | 'bokeh'): Rgb {
  const k = (FLAT_MEAN[look] * LED_CONTENT_PEAK) / Math.max(1, palette.length);
  const sum = palette.reduce<Rgb>((s, c) => [s[0] + c[0], s[1] + c[1], s[2] + c[2]], [0, 0, 0]);
  return [sum[0] * k, sum[1] * k, sum[2] * k];
}
