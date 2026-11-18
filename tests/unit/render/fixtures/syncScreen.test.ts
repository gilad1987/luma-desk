import { Color, PointLight } from 'three';
import { describe, expect, it } from 'vitest';
import { syncScreen } from '../../../../src/render/fixtures/sync/syncScreen';

// The expected values use the legacy frame-loop expressions verbatim (src/main.ts 5477-5484).
describe('syncScreen', () => {
  it('colours the wall, its spill light and the deck LED strip like the legacy frame loop', () => {
    const u = () => ({ value: 0 });
    const targets = {
      uniforms: { uT: u(), uDim: u(), uMode: u(), uSpd: u(), uCol: { value: new Color() } },
      light: new PointLight(),
      strip: { material: { color: new Color() } },
    };
    const o = { r: 80, g: 30, b: 55, gobo: 2.6, grot: 40 },
      intensity = 0.7,
      now = 98765.4;
    syncScreen(targets, o, intensity, now);
    const strip = new Color().setRGB(
      (o.r / 100) * intensity * 2,
      (o.g / 100) * intensity * 2,
      (o.b / 100) * intensity * 2,
    );
    const wall = new Color().setRGB(o.r / 100, o.g / 100, o.b / 100);
    expect(targets.strip.material.color.toArray()).toEqual(strip.toArray());
    expect(targets.light.color.toArray()).toEqual(wall.toArray());
    expect(targets.light.intensity).toBe(intensity * 9);
    expect(targets.uniforms.uCol.value.toArray()).toEqual(wall.toArray());
    expect(targets.uniforms.uDim.value).toBe(intensity);
    expect(targets.uniforms.uMode.value).toBe(3);
    expect(targets.uniforms.uSpd.value).toBe(40);
    expect(targets.uniforms.uT.value).toBe(now);
  });
});
