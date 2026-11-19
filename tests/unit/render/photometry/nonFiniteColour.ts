import type { LinearRgb } from '../../../../src/render/photometry';
import * as p from '../../../../src/render/photometry';
import type { Case } from './nonFiniteCases';

const at = (a: readonly number[], i: number): number => a[i] ?? 0;
const xy = (a: readonly number[], i: number): p.Chromaticity => ({ x: at(a, i), y: at(a, i + 1) });
const rgb = (a: readonly number[], i: number): LinearRgb => [at(a, i), at(a, i + 1), at(a, i + 2)];

/** Every function of the colour side of the module. */
export const COLOUR_CASES: Readonly<Record<string, Case>> = {
  xyYToXyz: [(a) => p.xyYToXyz(xy(a, 0), at(a, 2)), [0.4, 0.4, 100]],
  xyzToXy: [(a) => p.xyzToXy(rgb(a, 0)), [40, 40, 20]],
  linearSrgbToXyz: [(a) => p.linearSrgbToXyz(rgb(a, 0)), [1, 0.5, 0.2]],
  xyzToLinearSrgb: [(a) => p.xyzToLinearSrgb(rgb(a, 0)), [40, 40, 20]],
  relativeLuminance: [(a) => p.relativeLuminance(rgb(a, 0)), [1, 0.5, 0.2]],
  xyYToLinearSrgb: [(a) => p.xyYToLinearSrgb(xy(a, 0), at(a, 2)), [0.4, 0.4, 100]],
  linearToSrgb: [(a) => p.linearToSrgb(at(a, 0)), [0.5]],
  peakNormalise: [(a) => p.peakNormalise(rgb(a, 0)), [1, 0.5, 0.2]],
  toSrgb8: [(a) => p.toSrgb8(rgb(a, 0)), [1, 0.5, 0.2]],
  cctToXy: [(a) => p.cctToXy(at(a, 0)), [3200]],
  hueAngle: [(a) => p.hueAngle(xy(a, 0)), [0.4, 0.4]],
  isInSrgbGamut: [(a) => p.isInSrgbGamut(xy(a, 0)), [0.4, 0.4]],
  mapToSrgbGamut: [(a) => p.mapToSrgbGamut(xy(a, 0)), [0.17, 0.7]],
  emitterToLinear: [(a) => p.emitterToLinear(xy(a, 0), at(a, 2)), [0.17, 0.7, 100]],
  filterTransmission: [(a) => p.filterTransmission(rgb(a, 0), rgb(a, 3)), [1, 1, 1, 1, 0.5, 0]],
  mixChromaticity: [
    (a) =>
      p.mixChromaticity([
        { xy: xy(a, 0), amount: at(a, 2) },
        { xy: p.D65, amount: 1 },
      ]),
    [0.7, 0.3, 5],
  ],
  mixEmitters: [
    (a) =>
      p.mixEmitters([
        { xy: xy(a, 0), amount: at(a, 2) },
        { xy: p.D65, amount: 1 },
      ]),
    [0.7, 0.3, 5],
  ],
};
