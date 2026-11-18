import { describe, expect, it } from 'vitest';
import { lightFragmentShader, lightVertexShader } from '../../../../src/render/lighting/glsl';
import { apexDistance, SURFACE_GAIN, surfaceRadiance } from '../../../../src/render/lighting/surfacePhotometry';
import { apexOffset, candela, illuminance } from '../../../../src/render/photometry';

const RADIANS = Math.PI / 180;

describe('the near field of the surface light', () => {
  it.each([
    [2, 0.1, 8],
    [2, 0.1, 0.5],
    [25, 0.07, 1.5],
    [12, 0, 6],
    [40, 0.15, 0],
  ])('is the law of the photometry core: %i degrees, a %f m lens, %f m away', (degrees, radius, distance) => {
    const half = degrees * RADIANS;
    const core = illuminance(candela(900), distance, 1, apexOffset(radius, half));
    const apex = apexDistance(radius, Math.tan(half));
    expect(surfaceRadiance(900, distance, apex)).toBeCloseTo(SURFACE_GAIN * core, 9);
    expect(surfaceRadiance(900, distance, apex, 0.5)).toBeCloseTo(SURFACE_GAIN * 0.5 * core, 9);
  });

  it('has the virtual apex of the core, from the tangent a beam row holds', () => {
    for (const degrees of [1, 2, 10, 25, 60]) {
      const half = degrees * RADIANS;
      expect(apexDistance(0.1, Math.tan(half))).toBeCloseTo(apexOffset(0.1, half), 9);
    }
  });

  it('is dimmer than the lens radius alone gives for a narrow beam: the apex is metres behind the lens', () => {
    const tan = Math.tan(2 * RADIANS);
    const apex = apexDistance(0.1, tan);
    expect(apex).toBeCloseTo(2.8636, 3);
    // the former term, d^2 + r^2, over the law of the core at 8 m
    const former = (SURFACE_GAIN * 900) / (64 + 0.01);
    expect(former / surfaceRadiance(900, 8, apex)).toBeCloseTo((64 + apex * apex) / 64.01, 6);
    expect(former / surfaceRadiance(900, 8, apex)).toBeGreaterThan(1.12);
  });

  it('is the same term in the light shader: range from the lens and apex distance in quadrature', () => {
    // vGobo.w is the distance from the virtual apex to the lens, and dist2 the squared range from the lens centre
    expect(lightVertexShader).toContain('float apex = iGobo.z / iAxis.w;');
    expect(lightVertexShader).toContain('vGobo = vec4(iGobo.x, cos(iGobo.y), sin(iGobo.y), apex);');
    expect(lightVertexShader).toContain('(iOrigin.w + apex) * cosine / (cosine - spread) - apex');
    expect(lightFragmentShader).toContain('vec3 rel = world - vLens.xyz;');
    expect(lightFragmentShader).toContain('float dist2 = dot(rel, rel);');
    expect(lightFragmentShader).toContain('light * facing / (dist2 + vGobo.w * vGobo.w)');
    expect(lightFragmentShader).not.toContain('vLens.w * vLens.w');
  });
});
