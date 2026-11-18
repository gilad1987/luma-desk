/** A venue switch on `rigChanged`: the old venue leaves the scene and is freed, and the live venue follows. */
import { BufferGeometry, InstancedMesh, Material, Mesh, Points, Texture, type Object3D } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { bootStageScene, rebuild } from './stageSceneSetup';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

/** Every geometry, material, texture and instanced mesh under the scene, once each. */
function resourcesOf(roots: readonly Object3D[]): Set<unknown> {
  const out = new Set<unknown>();
  for (const root of roots)
    root.traverse((o) => {
      if (!(o instanceof Mesh || o instanceof Points)) return;
      if (o instanceof InstancedMesh) out.add(o);
      const materials = [o.material as Material | Material[]].flat();
      for (const r of [o.geometry as BufferGeometry, ...materials]) out.add(r);
      for (const m of materials) for (const v of Object.values(m)) if (v instanceof Texture) out.add(v);
    });
  return out;
}

/** Applies `design` and returns the resources the old scene had that the new one dropped, and those disposed. */
function switchTo(boot: ReturnType<typeof bootStageScene>, design: StageDesign) {
  const before = resourcesOf(boot.scene.children);
  const disposed = new Set<unknown>();
  const record = function (this: unknown): void {
    disposed.add(this);
  };
  const protos = [Material.prototype, BufferGeometry.prototype, InstancedMesh.prototype, Texture.prototype];
  const spies = protos.map((proto) => vi.spyOn(proto, 'dispose').mockImplementation(record));
  rebuild(boot, design);
  for (const spy of spies) spy.mockRestore();
  const after = resourcesOf(boot.scene.children);
  return { dropped: new Set([...before].filter((r) => !after.has(r))), disposed };
}

describe('StageScene venue switch', () => {
  it('frees every resource the old venue and stage dropped, and only those', () => {
    const boot = bootStageScene(BUILT_IN_DESIGN);
    for (const design of [createTemplate('empty'), createTemplate('festival'), BUILT_IN_DESIGN]) {
      const { dropped, disposed } = switchTo(boot, design);
      expect(dropped.size).toBeGreaterThan(0);
      for (const r of dropped) expect(disposed.has(r)).toBe(true);
      for (const r of resourcesOf(boot.scene.children)) expect(disposed.has(r)).toBe(false);
    }
  });

  it('builds the black box with the crowd hidden by its defaults, then Sultan’s Pool again with the boot children', () => {
    const boot = bootStageScene(BUILT_IN_DESIGN);
    const bootChildren = boot.scene.children.length;
    rebuild(boot, createTemplate('empty'));
    expect([boot.venue.sky, boot.venue.wallFloodlight, boot.venue.fohRig]).toEqual([null, null, []]);
    expect(boot.venue.scenery.isVisible('crowd')).toBe(false);
    rebuild(boot, BUILT_IN_DESIGN);
    expect(boot.scene.children.length).toBe(bootChildren);
    expect(boot.venue.scenery.isVisible('crowd')).toBe(true);
    expect(boot.venue.fohRig).toHaveLength(2);
  });

  it('builds the open field with a sky and toggles scenery without a venue rebuild', () => {
    const festival = createTemplate('festival');
    const boot = bootStageScene(festival);
    expect(boot.venue.sky).not.toBeNull();
    const first = boot.scene.children[0];
    const hidden = { ...festival, scenery: { ...festival.scenery, band: false } };
    rebuild(boot, hidden);
    expect(boot.scene.children[0]).toBe(first);
    expect(boot.venue.scenery.isVisible('band')).toBe(false);
  });
});
