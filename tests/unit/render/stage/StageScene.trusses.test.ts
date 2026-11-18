/** The `trusses` scenery switch: off builds no truss part, at boot and on a rebuild; a later rebuild builds them. */
import { Mesh, type Material, type Object3D } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { bootStageScene } from './stageSceneSetup';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

const withTrusses = (on: boolean): StageDesign => ({
  ...BUILT_IN_DESIGN,
  scenery: { ...BUILT_IN_DESIGN.scenery, trusses: on },
});

/** The scene children that draw with the truss steel: the truss sections (their chains use the chain material). */
function trussSections(scene: Object3D, steel: Material): Object3D[] {
  return scene.children.filter((child) => {
    let usesSteel = false;
    child.traverse((o) => {
      if (o instanceof Mesh && o.material === steel) usesSteel = true;
    });
    return usesSteel;
  });
}

/** Rebuilds the booted stage with `design` and its own rig. */
function rebuild(boot: ReturnType<typeof bootStageScene>, design: StageDesign): void {
  boot.stage.rebuild(design, rigFromDesign(design).fixtures);
}

describe('StageScene trusses switch', () => {
  it('builds no truss part at boot with the trusses off, and builds them on a rebuild that shows them', () => {
    const shown = bootStageScene(withTrusses(true));
    const sections = trussSections(shown.scene, shown.materials.truss).length;
    expect(sections).toBeGreaterThan(0);
    const boot = bootStageScene(withTrusses(false));
    expect(trussSections(boot.scene, boot.materials.truss)).toEqual([]);
    // the sections and their chains are the only children the switch removes
    expect(boot.scene.children.length).toBeLessThan(shown.scene.children.length - sections);
    rebuild(boot, withTrusses(true));
    expect(trussSections(boot.scene, boot.materials.truss)).toHaveLength(sections);
    expect(boot.scene.children.length).toBe(shown.scene.children.length);
  });

  it('takes every truss part out on a rebuild with the trusses off, and builds none on the next rebuild', () => {
    const boot = bootStageScene(withTrusses(true));
    const offChildren = bootStageScene(withTrusses(false)).scene.children.length;
    rebuild(boot, withTrusses(false));
    expect(trussSections(boot.scene, boot.materials.truss)).toEqual([]);
    expect(boot.scene.children.length).toBe(offChildren);
    rebuild(boot, withTrusses(false));
    expect(boot.scene.children.length).toBe(offChildren);
  });
});
