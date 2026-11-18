/**
 * Rebuild without leaks, measured without WebGL: every resource only the old visuals reach is disposed exactly
 * once, nothing the new visuals still use is disposed, and the old objects leave the scene.
 */
import { BufferGeometry, Color, Material, Mesh, PointLight, Texture, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import { festivalStage } from '../../../../src/domain/stage/templates/festival';
import { FixtureVisualSync, FixtureVisuals } from '../../../../src/render/fixtures';
import { LightFrame } from '../../../../src/render/lights/LightFrame';
import { buildFixtureScene } from './buildFixtureScene';
import { reachableResources as reachable } from './reachableResources';
import { stubCanvasDocument } from '../stubCanvasDocument';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

function setup() {
  stubCanvasDocument();
  const { scene, prims, beam, gobo, models, lensTextures } = buildFixtureScene();
  const u = () => ({ value: 0 });
  const uniforms = { uT: u(), uDim: u(), uMode: u(), uSpd: u(), uCol: { value: new Color() } };
  const targets = { uniforms, light: new PointLight(), strip: { material: { color: new Color() } } };
  const lights = new LightFrame();
  const goboTextures = gobo.textures;
  const sync = new FixtureVisualSync({
    visuals: [],
    selection: { has: () => false },
    screen: targets,
    beamTime: beam.time,
    goboTextures,
    lights,
  });
  const picker = { register: vi.fn(), clear: vi.fn() };
  const overlay = { setFixtures: vi.fn() };
  const visuals = new FixtureVisuals({ scene, prims, beam, gobo, models, lensTextures, picker, sync, overlay });
  const fixtures = rigFromDesign(festivalStage()).fixtures;
  const screens = new Map(
    fixtures.filter((f) => f.T.shape === 'screen').map((f) => [f.id, { mesh: new Mesh(), targets }]),
  );
  return { scene, sync, picker, overlay, visuals, fixtures, screens };
}

describe('FixtureVisuals.rebuild', () => {
  it('disposes exactly what the old festival visuals own, once each, and keeps the shared kit', () => {
    const { scene, sync, visuals, fixtures, screens } = setup();
    const first = visuals.rebuild(fixtures, screens);
    const sceneSize = scene.children.length;
    for (const [i, f] of fixtures.entries()) Object.assign(f.out, { dim: 100, strobe: 0, zoom: 20, gobo: (i % 7) + 1 });
    sync.update(1, 0.016, new Vector3(0, 5, 40));
    const lights = first.filter((v) => v.kind === 'light');
    const clones = lights.reduce((n, v) => n + v.poolTex.filter(Boolean).length, 0);
    const expected = lights.reduce((n, v) => n + (v.pix ? 6 : 5), clones);
    expect(clones).toBeGreaterThan(0);
    const oldResources = reachable(first);
    const disposed: unknown[] = [];
    const record = function (this: unknown): void {
      disposed.push(this);
    };
    for (const proto of [Material.prototype, Texture.prototype, BufferGeometry.prototype])
      vi.spyOn(proto, 'dispose').mockImplementation(record);
    const second = visuals.rebuild(fixtures, screens);
    const kept = reachable(second);
    const owned = [...oldResources].filter((r) => !kept.has(r));
    expect(owned.length).toBe(expected);
    expect(disposed.length).toBe(expected);
    expect(new Set(disposed)).toEqual(new Set(owned));
    expect(scene.children.length).toBe(sceneSize);
    for (const v of lights) expect(v.g.parent).toBeNull();
  });

  it('hands the new rig to the sync, the picker and the overlay, and empties them on dispose', () => {
    const { picker, overlay, visuals, fixtures, screens } = setup();
    const built = visuals.rebuild(fixtures, screens);
    expect(built.map((v) => v.fixture)).toEqual(fixtures);
    expect(overlay.setFixtures).toHaveBeenLastCalledWith(fixtures);
    expect(picker.clear).toHaveBeenCalledTimes(1);
    expect(picker.register.mock.calls.some(([o]) => o === screens.values().next().value?.mesh)).toBe(true);
    visuals.dispose();
    expect(visuals.visuals).toEqual([]);
    expect(overlay.setFixtures).toHaveBeenLastCalledWith([]);
  });

  it('refuses a screen fixture without a slot', () => {
    const { visuals, fixtures } = setup();
    expect(fixtures.some((f) => f.T.shape === 'screen')).toBe(true);
    expect(() => visuals.rebuild(fixtures, new Map())).toThrow(/no screen mesh/);
  });
});
