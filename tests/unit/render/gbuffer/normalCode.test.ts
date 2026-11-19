import { describe, expect, it } from 'vitest';
import { surfaceFragmentShader } from '../../../../src/render/gbuffer/glsl';
import { decodeNormal, encodeNormal, type Triple } from '../../../../src/render/gbuffer/normalCode';

const degrees = (a: Triple, b: Triple): number =>
  (Math.acos(Math.min(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], 1)) * 180) / Math.PI;

describe('the normal buffer', () => {
  it('holds the world normal of a tilted plane to better than one degree, for every tilt and heading', () => {
    let worst = 0;
    for (let tilt = 0; tilt <= 180; tilt += 0.5) {
      for (let heading = 0; heading < 360; heading += 7) {
        const t = (tilt * Math.PI) / 180;
        const h = (heading * Math.PI) / 180;
        const normal: Triple = [Math.sin(t) * Math.cos(h), Math.cos(t), Math.sin(t) * Math.sin(h)];
        worst = Math.max(worst, degrees(normal, decodeNormal(encodeNormal(normal))));
      }
    }
    expect(worst).toBeLessThan(1);
    expect(worst).toBeGreaterThan(0);
  });

  it('is written by the shader with the code this test measures', () => {
    expect(surfaceFragmentShader).toContain('normal * 0.5 + 0.5');
    expect(surfaceFragmentShader).toContain('(1.0 + 254.0 * clamp(uMetalness, 0.0, 1.0)) / 255.0');
  });
});
