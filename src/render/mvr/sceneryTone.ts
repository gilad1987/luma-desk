import { Color, SRGBColorSpace, type Material } from 'three';

/**
 * The file colour of a scenery material reduced to a few buckets: its hue in twelfths of the wheel (none for a grey,
 * where hue means nothing) and its lightness in three levels. Class looks are pooled per class and tone, so a plot
 * with a hundred CAD colours still draws with a few materials per class, and a black truss stays darker than a
 * silver one.
 */
export interface Tone {
  readonly hue: number | undefined;
  readonly level: 0 | 1 | 2;
}

/** Below this saturation, or this close to black or white, a file colour is grey: its hue is noise. */
const GREY_SATURATION = 0.15;
const GREY_EDGE = 0.06;
const HUES = 12;

const tones = new WeakMap<Material, Tone>();

/** The tone of an sRGB file colour. */
export function toneOfColor(color: Color): Tone {
  const { h, s, l } = color.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
  const grey = s < GREY_SATURATION || l < GREY_EDGE || l > 1 - GREY_EDGE;
  const level = Math.min(2, Math.floor(l * 3)) as Tone['level'];
  return { hue: grey ? undefined : (Math.round(h * HUES) % HUES) / HUES, level };
}

/** Remembers the tone of `fileColor` for `material`, which `styleScenery` made from it, and returns `material`. */
export function recordTone<M extends Material>(material: M, fileColor: Color): M {
  tones.set(material, toneOfColor(fileColor));
  return material;
}

/**
 * The tone of the file colour `material` was made from; for a material `styleScenery` never saw, the tone of its own
 * colour, or white's when it has none.
 */
export function toneOf(material: Material): Tone {
  const recorded = tones.get(material);
  if (recorded) return recorded;
  const color = 'color' in material && material.color instanceof Color ? material.color : new Color(0xffffff);
  return toneOfColor(color);
}

/** A key that is equal for equal tones, for pooling. */
export function toneKey({ hue, level }: Tone): string {
  return `${hue ?? 'grey'}/${level}`;
}
