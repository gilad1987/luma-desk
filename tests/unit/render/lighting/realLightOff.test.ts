import { DepthTexture, PerspectiveCamera, Scene, Texture, WebGLRenderTarget } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import beamVertexShader from '../../../../src/render/beams/glsl/beam.vert.glsl?raw';
import { ROW } from '../../../../src/render/beams/packBeam';
import { lightVertexShader } from '../../../../src/render/lighting/glsl';
import { KEYS, KeyShadows, TURN } from '../../../../src/render/lighting/KeyShadows';
import { LightBatch } from '../../../../src/render/lighting/LightBatch';
import { replacesPools, surfaceLight } from '../../../../src/render/lighting/surfaceLight';
import { SurfaceLightPass } from '../../../../src/render/lighting/SurfaceLightPass';
import { createFakeRenderer } from '../../shared';

const ROW_VALUES = [0, 8, 4, 9, 0, -0.6, -0.8, 0.1, 5, 5, 5, 0.8, 0, 0, 0.1, 0];

afterEach(() => {
  surfaceLight.batch = undefined;
  surfaceLight.isEnabled = true;
  surfaceLight.isAwaited = () => false;
});

describe('Real light off on an MVR stage', () => {
  it('gives the batch back and draws nothing, so the floor pools and the stand-in lights return', () => {
    const context = {
      camera: new PerspectiveCamera(),
      scene: new Scene(),
      sceneDepth: { texture: new DepthTexture(4, 4) },
      occlusion: new Texture(),
    };
    const rows = new LightBatch();
    rows.offer({ visible: true, parent: {} }, 3, new Float32Array(ROW_VALUES), 0.6);
    const pass = new SurfaceLightPass(context, { rows, goboSheet: new Texture(), ownsSheet: true });
    const renderer = createFakeRenderer();
    const buffer = new WebGLRenderTarget(4, 4);
    surfaceLight.isAwaited = () => true;
    pass.render(renderer.asRenderer, buffer, buffer);
    expect(surfaceLight.batch).toBe(rows);
    expect(replacesPools()).toBe(true);
    const draws = renderer.render.mock.calls.length;
    expect(draws).toBeGreaterThan(0);
    surfaceLight.isEnabled = false;
    pass.render(renderer.asRenderer, buffer, buffer);
    expect(surfaceLight.batch).toBeUndefined();
    expect(renderer.render.mock.calls.length).toBe(draws);
    expect(replacesPools()).toBe(false);
    surfaceLight.isEnabled = true;
    // on again, before the pass draws its next frame: the decals are already off, so none flashes
    expect(replacesPools()).toBe(true);
    pass.render(renderer.asRenderer, buffer, buffer);
    expect(surfaceLight.batch).toBe(rows);
    pass.dispose();
  });

  it('keeps the decals off while the surface light is on its way, and on for a stage it never comes to', () => {
    expect(replacesPools()).toBe(false);
    surfaceLight.isAwaited = () => true;
    expect(replacesPools()).toBe(true);
  });
});

describe('what the light volume shares with the beam volume and the maps', () => {
  it('has the gobo frame of the beam shader, as one expression in both', () => {
    const frame = /float fromUp = [\s\S]*?vec3 up = cross\(axis, side\);/;
    const ofBeam = frame.exec(beamVertexShader)?.[0];
    expect(ofBeam).toContain('normalize(vec3(1.0, 0.0, 0.0) - (axis.x / fromUp) * (axis - vec3(0.0, 1.0, 0.0)))');
    expect(frame.exec(lightVertexShader)?.[0]).toBe(ofBeam);
  });

  it('draws each shadow map again in turn by age, one per turn', () => {
    const keys = new KeyShadows();
    const rows = new Float32Array(KEYS * ROW);
    for (let i = 0; i < KEYS; i++) rows.set(ROW_VALUES, i * ROW);
    const frame = (): void => {
      for (let i = 0; i < KEYS; i++) keys.offer(i, i, rows.subarray(i * ROW, (i + 1) * ROW));
      keys.update(rows, new Float32Array(KEYS * 4), 1);
    };
    frame();
    for (let slot = keys.next(); slot >= 0; slot = keys.next()) keys.drawn(slot);
    const aged: number[] = [];
    for (let n = 1; n < TURN * KEYS; n++) {
      frame();
      const slot = keys.next();
      if (slot >= 0) keys.drawn(aged[aged.push(slot) - 1] ?? 0);
    }
    expect([...aged].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
