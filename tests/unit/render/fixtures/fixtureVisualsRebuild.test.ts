/**
 * Rebuild without leaks, measured without WebGL: every resource only the old visuals reach is disposed exactly
 * once, nothing the new visuals still use is disposed, and the old objects leave the scene. It runs on the festival
 * rig and on the built-in rig, whose pixel bars own one more resource per light.
 */
import { BufferGeometry, Material, Texture, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { festivalStage } from '../../../../src/domain/stage/templates/festival';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { reachableResources as reachable } from './reachableResources';
import { setupFixtureVisuals } from './fixtureVisualsSetup';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

const RIGS = [
  { name: 'festival', design: festivalStage(), hasPix: false },
  { name: 'built-in', design: BUILT_IN_DESIGN, hasPix: true },
];

describe.each(RIGS)('FixtureVisuals.rebuild on the $name rig', ({ design, hasPix }) => {
  it('disposes exactly what the old visuals own, once each, and keeps the shared kit', () => {
    const { scene, sync, visuals, fixtures, screens } = setupFixtureVisuals(design);
    const first = visuals.rebuild(fixtures, screens);
    const sceneSize = scene.children.length;
    for (const [i, f] of fixtures.entries()) Object.assign(f.out, { dim: 100, strobe: 0, zoom: 20, gobo: (i % 7) + 1 });
    sync.update(1, 0.016, new Vector3(0, 5, 40));
    const lights = first.filter((v) => v.kind === 'light');
    if (hasPix) expect(lights.some((v) => v.pix)).toBe(true);
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
});
