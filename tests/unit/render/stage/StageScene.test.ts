/** The stage scene's build and rebuild contract: one surface update per build, refit on rebuild only, no leaks. */
import { BufferGeometry, InstancedMesh, Material, Mesh, type Object3D } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Fixture } from '../../../../src/domain/Fixture';
import { boundsOf } from '../../../../src/domain/stage/bounds';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import { surfacesOf } from '../../../../src/domain/stage/surfaces';
import { festivalStage } from '../../../../src/domain/stage/templates/festival';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { ScreenSlot } from '../../../../src/render/fixtures';
import { bootStageScene } from './stageSceneSetup';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

/** The built-in deck's scene children: deck, skirt and nosing (it has no risers). */
const BUILT_IN_DECK_PARTS = 3;
/** The built-in LED wall's scene children: the wall, two side screens with their frames, the strip, the frame. */
const BUILT_IN_WALL_PARTS = 7;

/** Every geometry, material and instanced mesh under `roots`, once each. */
function resourcesOf(roots: readonly Object3D[]): Set<unknown> {
  const out = new Set<unknown>();
  for (const root of roots)
    root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const mesh = o as Mesh<BufferGeometry, Material | Material[]>;
      if (o instanceof InstancedMesh) out.add(o);
      for (const r of [mesh.geometry, ...[mesh.material].flat()]) out.add(r);
    });
  return out;
}

describe('StageScene', () => {
  it('sets the surfaces once at boot and leaves the camera alone', () => {
    const { surfaces, views, host } = bootStageScene(BUILT_IN_DESIGN);
    expect(surfaces.setSurfaces).toHaveBeenCalledTimes(1);
    expect(surfaces.setSurfaces).toHaveBeenCalledWith(surfacesOf(BUILT_IN_DESIGN), 'sultans-pool');
    expect(views.fitTo).not.toHaveBeenCalled();
    expect(views.setView).not.toHaveBeenCalled();
    const [fixtures, slots] = host.visuals.rebuild.mock.calls[0] as [Fixture[], Map<number, ScreenSlot>];
    expect(fixtures).toEqual(rigFromDesign(BUILT_IN_DESIGN).fixtures);
    expect([...slots.keys()]).toEqual([2001]);
  });

  it('rebuilds with exactly one setSurfaces, then refits the views and hands over the rig', () => {
    const { surfaces, views, host, stage } = bootStageScene(BUILT_IN_DESIGN);
    const design = festivalStage(),
      fixtures = rigFromDesign(design).fixtures;
    stage.rebuild(design, fixtures);
    expect(surfaces.setSurfaces).toHaveBeenCalledTimes(2);
    expect(surfaces.setSurfaces).toHaveBeenLastCalledWith(surfacesOf(design), 'open-field');
    expect(views.fitTo).toHaveBeenCalledWith(boundsOf(design));
    expect(views.setView).toHaveBeenCalledWith('top');
    expect(host.visuals.rebuild).toHaveBeenCalledTimes(2);
    expect(host.overlay.setFixtures).toHaveBeenCalledWith(fixtures);
  });

  it('frees exactly what the old parts own and keeps the kit and venue materials', () => {
    const { scene, stage, materials } = bootStageScene(festivalStage());
    const design = festivalStage(),
      fixtures = rigFromDesign(design).fixtures;
    stage.rebuild(design, fixtures);
    const before = [...scene.children];
    const disposed = new Set<unknown>();
    const record = function (this: unknown): void {
      disposed.add(this);
    };
    for (const proto of [Material.prototype, BufferGeometry.prototype, InstancedMesh.prototype])
      vi.spyOn(proto, 'dispose').mockImplementation(record);
    stage.rebuild(design, fixtures);
    const kept = resourcesOf(scene.children);
    const owned = [...resourcesOf(before)].filter((r) => !kept.has(r));
    expect(owned.length).toBeGreaterThan(0);
    expect(disposed).toEqual(new Set(owned));
    expect(scene.children.length).toBe(before.length);
    for (const m of Object.values(materials)) expect(disposed.has(m)).toBe(false);
    // the venue stays; every old stage part left the scene
    const gone = before.filter((o) => !scene.children.includes(o));
    expect(gone.length).toBeGreaterThan(0);
    for (const o of gone) expect(o.parent).toBeNull();
  });

  it('builds no deck and no LED wall when the design hides them, and drops the screen fixture', () => {
    const { scene, host } = bootStageScene(BUILT_IN_DESIGN);
    const shown = scene.children.length;
    const hidden = { ...BUILT_IN_DESIGN, scenery: { ...BUILT_IN_DESIGN.scenery, deck: false, ledWall: false } };
    const hiddenStage = bootStageScene(hidden);
    expect(hiddenStage.scene.children.length).toBe(shown - BUILT_IN_DECK_PARTS - BUILT_IN_WALL_PARTS);
    const [fixtures, slots] = hiddenStage.host.visuals.rebuild.mock.calls[0] as [Fixture[], Map<number, ScreenSlot>];
    expect(slots.size).toBe(0);
    expect(fixtures.some((f) => f.id === 2001)).toBe(false);
    // the overlay labels the same fixtures: a screen without a wall gets no label
    expect(hiddenStage.host.overlay.setFixtures).toHaveBeenCalledWith(fixtures);
    expect(host.visuals.rebuild).toHaveBeenCalledTimes(1);
  });
});
