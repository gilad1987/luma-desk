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
    selection: { has: (id) => id === built.fixtures[0]?.id },
    beamTime: built.beam.time,
    goboTextures: built.gobo.textures,
    lights,
  });
  sync.setVisuals(built.visuals, new Map([...built.screenMeshes.keys()].map((id) => [id, screen])));
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
    const spec = lit.fixture.T,
      zoom = clamp(20, spec.zr[0], spec.zr[1]);
    const expected = 0.8 * spec.power * (spec.beamK ?? 1) * 0.38 * clamp(Math.pow(14 / (zoom + 4), 0.8), 0.06, 2.2);
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

  it('gives each key-light candidate its own colour, though the sync reuses its colour buffer per fixture', () => {
    const { visuals, sync, lights } = setup();
    const movers = visuals.filter((v) => v.kind === 'light' && v.fixture.T.moving && v.fixture.T.shape !== 'blinder');
    const [red, blue] = movers;
    if (!red || !blue) throw new Error('rig has fewer than two movers');
    Object.assign(red.fixture.out, { dim: 100, strobe: 0, pan: 0, tilt: 0, r: 100, g: 0, b: 0, zoom: 20, gobo: 0 });
    Object.assign(blue.fixture.out, { dim: 100, strobe: 0, pan: 0, tilt: 0, r: 0, g: 0, b: 100, zoom: 20, gobo: 0 });
    sync.update(1, 0.016, new Vector3());
    const colorOf = (v: (typeof movers)[number]) => lights.keyCandidates.find((c) => c.fixture === v.fixture)?.color;
    expect(colorOf(red)).toEqual([1, 0, 0]);
    expect(colorOf(blue)).toEqual([0, 0, 1]);
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
