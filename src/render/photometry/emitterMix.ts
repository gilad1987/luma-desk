import { xyYToXyz, xyzToXy, type Chromaticity } from './chromaticity';
import { mapToSrgbGamut } from './gamut';
import { relativeLuminance, xyYToLinearSrgb, type LinearRgb } from './srgb';

/** One emitter of a fixture (a red LED, a white LED, a lamp): its colour and how much light it gives now. */
export interface Emitter {
  readonly xy: Chromaticity;
  /** Lumens (or candela, or any photometric amount: the mix comes back in the same unit). */
  readonly amount: number;
}

/**
 * The linear sRGB value of an amount of light of one colour, with the colour brought inside the gamut first. The
 * luminance of the result (`relativeLuminance`) is the amount: gamut mapping changes the saturation, never the
 * lumens. A channel that the mapping left a rounding step below 0 is set to 0.
 *
 * @param amount lumens, candela, lux or nits
 * @returns the amount per colour channel, in the same unit
 */
export function emitterToLinear(xy: Chromaticity, amount: number): LinearRgb {
  const rgb = xyYToLinearSrgb(mapToSrgbGamut(xy), amount);
  return [Math.max(rgb[0], 0), Math.max(rgb[1], 0), Math.max(rgb[2], 0)];
}

/**
 * The additive mix of emitters in linear sRGB. The XYZ values add first (`mixChromaticity`), and the gamut mapping
 * runs once, on the sum. A map per emitter before the sum is wrong: a red and a green LED mix to a saturated yellow
 * outside the gamut, and two separate moves toward the gamut give a pale peach. Source: Grassmann's laws (light adds
 * linearly in XYZ).
 */
export function mixEmitters(emitters: readonly Emitter[]): LinearRgb {
  const mix = mixChromaticity(emitters);
  return emitterToLinear(mix.xy, mix.amount);
}

/**
 * The true colour and amount of a mix, with no gamut mapping: the XYZ values add, weighted by the amount of each
 * emitter. A colour meter in front of the fixture reads this.
 */
export function mixChromaticity(emitters: readonly Emitter[]): Emitter {
  const sum: [number, number, number] = [0, 0, 0];
  for (const emitter of emitters) {
    const xyz = xyYToXyz(emitter.xy, Math.max(emitter.amount, 0));
    sum[0] += xyz[0];
    sum[1] += xyz[1];
    sum[2] += xyz[2];
  }
  return { xy: xyzToXy(sum), amount: sum[1] };
}

/**
 * The luminous transmittance of a colour filter in front of a source, with the filter as a factor per linear sRGB
 * channel: tau = Y(source x filter) / Y(source). It is the "colour transmission" of `emittedFlux`. A filter per
 * channel is an approximation: a real gel or a CMY flag works on the spectrum.
 *
 * @param source linear sRGB of the open beam, any scale
 * @param filter the fraction each channel passes, 0..1
 * @returns 0..1; 0 for a black source
 */
export function filterTransmission(source: LinearRgb, filter: LinearRgb): number {
  const open = relativeLuminance(source);
  if (!(open > 0)) return 0;
  return relativeLuminance([source[0] * filter[0], source[1] * filter[1], source[2] * filter[2]]) / open;
}
