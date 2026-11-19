import type { Vec3Tuple } from '../../../../src/core';
import * as p from '../../../../src/render/photometry';

/** One public function: how to call it from a list of numbers, and a list of valid numbers to start from. */
export type Case = readonly [call: (a: readonly number[]) => unknown, base: readonly number[]];

/** The raw value as a unit, with no clean-up: the brand constructors would turn NaN into 0 before the call. */
const lm = (v: number): p.Lumens => v as p.Lumens;
const cd = (v: number): p.Candela => v as p.Candela;
const lx = (v: number): p.Lux => v as p.Lux;
const nt = (v: number): p.Nits => v as p.Nits;
const at = (a: readonly number[], i: number): number => a[i] ?? 0;
const vec = (a: readonly number[], i: number): Vec3Tuple => [at(a, i), at(a, i + 1), at(a, i + 2)];
const profile = (a: readonly number[], i: number): p.BeamProfile => ({
  beamHalf: at(a, i),
  fieldHalf: at(a, i + 1),
  exponent: at(a, i + 2),
});
const source = (a: readonly number[]): p.ConeSource => ({
  lens: vec(a, 0),
  axis: vec(a, 3),
  profile: p.resolveBeamProfile(at(a, 6), at(a, 7)),
  peak: cd(at(a, 8)),
  sourceRadius: at(a, 9),
});
const SOURCE = [0, 0, 0, 0, 0, 1, 10, 18, 290_000, 0.05];

/** Every function of the light side of the module (the colour side is in `nonFiniteColour.ts`). */
export const LIGHT_CASES: Readonly<Record<string, Case>> = {
  halfAngleOf: [(a) => p.halfAngleOf(at(a, 0)), [10]],
  coneSolidAngle: [(a) => p.coneSolidAngle(at(a, 0)), [10]],
  uniformConeIntensity: [(a) => p.uniformConeIntensity(lm(at(a, 0)), at(a, 1)), [10_000, 10]],
  profileAt: [(a) => p.profileAt(profile(a, 0), at(a, 3)), [0.1, 0.2, 2, 0.05]],
  profileExponent: [(a) => p.profileExponent(at(a, 0), at(a, 1)), [0.1, 0.2]],
  resolveBeamProfile: [(a) => p.resolveBeamProfile(at(a, 0), at(a, 1)), [10, 18]],
  gaussLegendre: [(a) => p.gaussLegendre(at(a, 0)), [8]],
  integrate: [(a) => p.integrate((x) => x * at(a, 0), at(a, 1), at(a, 2), at(a, 3)), [1, 0, 1, 8]],
  emittedFlux: [(a) => p.emittedFlux(at(a, 0), at(a, 1), at(a, 2)), [1000, 1, 1]],
  peakCandela: [(a) => p.peakCandela(lm(at(a, 0)), profile(a, 1), at(a, 4)), [10_000, 0.1, 0.2, 2, 16]],
  profileSolidAngle: [(a) => p.profileSolidAngle(profile(a, 0), at(a, 3)), [0.1, 0.2, 2, 16]],
  apexOffset: [(a) => p.apexOffset(at(a, 0), at(a, 1)), [0.05, 0.1]],
  discIlluminance: [(a) => p.discIlluminance(lm(at(a, 0)), at(a, 1)), [10_000, 2]],
  illuminance: [(a) => p.illuminance(cd(at(a, 0)), at(a, 1), at(a, 2), at(a, 3)), [1000, 10, 1, 0.3]],
  lambertLuminance: [(a) => p.lambertLuminance(lx(at(a, 0)), at(a, 1)), [1000, 0.18]],
  beamDiameter: [(a) => p.beamDiameter(at(a, 0), at(a, 1), at(a, 2)), [10, 10, 0.05]],
  footprintEllipse: [(a) => p.footprintEllipse(at(a, 0), at(a, 1), at(a, 2), at(a, 3)), [10, 10, 30, 0.05]],
  lensLuminance: [(a) => p.lensLuminance(cd(at(a, 0)), at(a, 1), nt(at(a, 2))), [1000, 0.05, 1e9]],
  uniformLensLuminance: [
    (a) => p.uniformLensLuminance(lm(at(a, 0)), at(a, 1), at(a, 2), nt(at(a, 3))),
    [1000, 0.05, 10, 1e9],
  ],
  zoomAt: [
    (a) => {
      const ends = { narrowFieldDeg: at(a, 0), wideFieldDeg: at(a, 1), beamToField: at(a, 2) };
      return [
        p.zoomAt(ends, at(a, 3), lm(at(a, 4))),
        p.zoomAt({ ...ends, narrowFlux: at(a, 5), wideFlux: 1 }, 0, lm(1)),
      ];
    },
    [10, 40, 0.6, 0.5, 1000, 900],
  ],
  extinctionOf: [(a) => p.extinctionOf(at(a, 0)), [100]],
  hazeMedium: [(a) => p.hazeMedium(at(a, 0), at(a, 1)), [100, 0.9]],
  transmittance: [(a) => p.transmittance(at(a, 0), at(a, 1)), [0.04, 10]],
  henyeyGreenstein: [(a) => p.henyeyGreenstein(at(a, 0), at(a, 1)), [0.5, 0.6]],
  twoLobePhase: [
    (a) => p.twoLobePhase(at(a, 0), { forward: at(a, 1), back: at(a, 2), forwardWeight: at(a, 3) }),
    [0.5, 0.8, -0.3, 0.9],
  ],
  inScatterIntegrand: [(a) => p.inScatterIntegrand(at(a, 0), at(a, 1), lx(at(a, 2)), at(a, 3)), [0.04, 0.1, 100, 0.9]],
  inverseSquareIntegral: [(a) => p.inverseSquareIntegral(at(a, 0), at(a, 1), at(a, 2), at(a, 3)), [2, -1, 0, 3]],
  rayApex: [(a) => p.rayApex(vec(a, 0), vec(a, 3), vec(a, 6)), [-1, 3, 0, 1, 0, 0, 0, 5, 0]],
  coneIrradiance: [(a) => p.coneIrradiance(source(a), vec(a, 10), at(a, 13)), [...SOURCE, 0.2, 0, 10, 0.04]],
  inScatteredRadiance: [
    (a) => {
      const ray = { origin: vec(a, 10), direction: vec(a, 13), length: at(a, 16) };
      const medium = { sigmaT: at(a, 17), sigmaS: at(a, 18), phase: (mu: number) => p.twoLobePhase(mu) };
      return p.inScatteredRadiance(source(a), ray, medium, at(a, 19));
    },
    [...SOURCE, -3, 0, 5, 1, 0, 0, 6, 0.04, 0.038, 16],
  ],
  ev100: [(a) => p.ev100(at(a, 0), at(a, 1), at(a, 2)), [2.8, 0.02, 800]],
  exposureScale: [(a) => p.exposureScale(at(a, 0)), [6]],
  saturationLuminance: [(a) => p.saturationLuminance(at(a, 0)), [6]],
};
