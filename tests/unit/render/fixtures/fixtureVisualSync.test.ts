import { Color, PointLight, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clamp } from '../../../../src/core';
import { FixtureVisualSync } from '../../../../src/render/fixtures';
import { LightFrame } from '../../../../src/render/lights/LightFrame';
import { buildFixtureScene } from './buildFixtureScene';
import { stubCanvasDocument } from '../stubCanvasDocument';

afterEach(() => vi.unstubAllGlobals());

function setup() {
  stubCanvasDocument();
  const built = buildFixtureScene();
  const u = () => ({ value: 0 });
  const screen = {
    uniforms: { uT: u(), uDim: u(), uMode: u(), uSpd: u(), uCol: { value: new Color() } },
    light: new PointLight(),
    strip: { material: { color: new Color() } },
  };
  const lights = new LightFrame();
  const sync = new FixtureVisualSync({
    visuals: built.visuals,
    selection: { has: (id) => id === built.fixtures[0]?.id },
    screen,
    beamTime: built.beam.time,
    goboTextures: built.gobo.textures,
    lights,
  });
  return { ...built, screen, lights, sync };
}

describe('FixtureVisualSync', () => {
  it('computes beam intensity with the legacy formula and hides dark fixtures', () => {
    const { visuals, sync } = setup();
    const lit = visuals.find((v) => v.kind === 'light' && v.fixture.T.moving);
    const dark = visuals.find((v) => v.kind === 'light' && v !== lit);
    if (lit?.kind !== 'light' || dark?.kind !== 'light') throw new Error('rig has no lights');
    Object.assign(lit.fixture.out, { dim: 80, strobe: 0, pan: 0, tilt: 0, r: 100, g: 50, b: 0, zoom: 20, gobo: 0 });
    Object.assign(dark.fixture.out, { dim: 0, strobe: 0, pan: 0, tilt: 0, r: 0, g: 0, b: 0, zoom: 20, gobo: 0 });
    sync.update(1, 0.016, new Vector3(0, 5, 40));
    const T = lit.fixture.T,
      zoom = clamp(20, T.zr[0], T.zr[1]);
    const expected = 0.8 * T.power * (T.beamK ?? 1) * 0.38 * clamp(Math.pow(14 / (zoom + 4), 0.8), 0.06, 2.2);
    expect(lit.uniforms.uInt.value).toBe(expected);
    expect(lit.lensMat.color.toArray()).toEqual([0.03 + 1 * 0.8 * 3, 0.03 + 0.5 * 0.8 * 3, 0.03]);
    expect(lit.beam.visible).toBe(true);
    expect(dark.beam.visible).toBe(false);
    expect(lit.bodyMat.emissive.getHex()).toBe(lit.fixture.id === visuals[0]?.fixture.id ? 0x7a5a00 : 0);
  });

  it('drives the screen, its light and the LED strip, and advances the beam time there', () => {
    const { visuals, sync, screen, beam } = setup();
    const v = visuals.find((x) => x.kind === 'screen');
    if (!v) throw new Error('no screen');
    Object.assign(v.fixture.out, { dim: 50, strobe: 0, r: 100, g: 0, b: 0, gobo: 3.4, grot: 7 });
    sync.update(2.5, 0.016, new Vector3());
    expect(screen.uniforms.uMode.value).toBe(3);
    expect(screen.uniforms.uSpd.value).toBe(7);
    expect(screen.light.intensity).toBe(4.5);
    expect(screen.strip.material.color.r).toBe(1 * 0.5 * 2);
    expect(beam.time.value).toBe(2.5);
  });

  it('gates the strobe: open for 22 % of each period', () => {
    const { visuals, sync } = setup();
    const v = visuals.find((x) => x.kind === 'light');
    if (v?.kind !== 'light') throw new Error('no light');
    Object.assign(v.fixture.out, { dim: 100, strobe: 100, r: 100, g: 100, b: 100, zoom: 20 });
    sync.update(0.005, 0.016, new Vector3());
    expect(v.beam.visible).toBe(true);
    sync.update(0.02, 0.016, new Vector3());
    expect(v.beam.visible).toBe(false);
  });
});
