import { describe, expect, it } from 'vitest';
import { beamFragmentShader } from '../../../../src/render/beams/glsl';
import { lightFragmentShader } from '../../../../src/render/lighting/glsl';
import { apexDistance, SURFACE_GAIN, surfaceRadiance } from '../../../../src/render/lighting/surfacePhotometry';
import { candela, illuminance, inverseSquareIntegral, rayApex } from '../../../../src/render/photometry';

type Vec = [number, number, number];
const LENS: Vec = [1, 8, -2];
const AXIS: Vec = [0, -0.6, -0.8];
const at = (origin: Vec, direction: Vec, t: number): Vec =>
  [0, 1, 2].map((i) => (origin[i] ?? 0) + (direction[i] ?? 0) * t) as Vec;
const distance = (p: Vec, q: Vec): number => Math.hypot(...p.map((v, i) => v - (q[i] ?? 0)));

/** The closed form of `scatter.glsl`: the ray seen from the lens, with the apex distance added to its height. */
function shaftIntegral(origin: Vec, direction: Vec, apex: number, span: [number, number]): number {
  const { height, offset } = rayApex(origin, direction, LENS);
  return inverseSquareIntegral(Math.hypot(height, apex), offset, span[0], span[1]);
}

describe('the falloff of the beam shaft', () => {
  it.each([
    [2, 0.1],
    [25, 0.07],
    [12, 0],
  ])('is the law of the photometry core along a view ray: %i degrees, a %f m lens', (degrees, radius) => {
    const apex = apexDistance(radius, Math.tan((degrees * Math.PI) / 180));
    const origin: Vec = [-6, 2, 9];
    const direction: Vec = [0.48, 0.2, -0.854];
    const length = Math.hypot(...direction);
    const unit = direction.map((v) => v / length) as Vec;
    // the core's irradiance of a 1 cd source, summed along the ray in small steps
    let sum = 0;
    const steps = 20000;
    for (let i = 0; i < steps; i++) {
      const t = 3 + ((i + 0.5) * 14) / steps;
      sum += (illuminance(candela(1), distance(at(origin, unit, t), LENS), 1, apex) * 14) / steps;
    }
    expect(shaftIntegral(origin, unit, apex, [3, 17])).toBeCloseTo(sum, 7);
  });

  it('has one level with the pool: on the axis a shaft sample and the surface light divide by the same term', () => {
    const apex = apexDistance(0.1, Math.tan((2 * Math.PI) / 180));
    for (const d of [0.5, 3, 8, 20]) {
      const point = at(LENS, AXIS, d);
      // a short piece of a ray across the axis at the point: the integrand there, times the length of the piece
      const across: Vec = [1, 0, 0];
      const piece = shaftIntegral(at(point, across, -0.0005), across, apex, [0, 0.001]) / 0.001;
      expect(piece * SURFACE_GAIN).toBeCloseTo(surfaceRadiance(1, d, apex), 6);
      // the former shaft law, the inverse square from the apex, was dimmer than the pool by this factor
      expect((d + apex) ** 2 / (d * d + apex * apex)).toBeCloseTo(
        surfaceRadiance(1, d, apex) / (SURFACE_GAIN / (d + apex) ** 2),
        9,
      );
    }
  });

  it('is written in the beam shader as the ray from the lens with the apex distance in its height', () => {
    expect(beamFragmentShader).toContain('vec3 cl = co - axis * vApex.w;');
    expect(beamFragmentShader).toContain('float b = dot(cl, d);');
    expect(beamFragmentShader).toContain('float h = sqrt(max(dot(cl, cl) - b * b + vApex.w * vApex.w, 1e-4));');
    expect(beamFragmentShader).toContain('exp(-uHaze.y * (length(p) * (z - vApex.w) / z + t))');
    expect(beamFragmentShader).not.toContain('dot(co, co) - b * b');
    expect(lightFragmentShader).toContain('(dist2 + vGobo.w * vGobo.w)');
  });
});
