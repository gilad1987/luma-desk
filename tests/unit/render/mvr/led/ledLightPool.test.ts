/**
 * The wall lights: a fixed set of four that is always in the scene, synced on every frame by a mesh that is never
 * culled, so "off" reaches the lights also when no wall draws. Marked mesh layers are sources too, and walls that
 * coincide on two layers get one light.
 */
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Scene, SpotLight, type Object3D } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { drawAsLed, freeLedMaterials } from '../../../../../src/render/mvr/led/ledLayerLook.ts';
import { LedWallLights, wallLights } from '../../../../../src/render/mvr/led/ledLights.ts';
import { syncWallLights } from '../../../../../src/render/mvr/led/ledLightPool.ts';
import { createLedMaterial } from '../../../../../src/render/mvr/led/ledMaterial.ts';
import { setLedWallPercent } from '../../../../../src/render/mvr/led/ledUniforms.ts';

afterEach(() => setLedWallPercent(25));

const venue = { min: [-15, 0, -15], max: [15, 10, 15] } as const;
const wall = { layer: 'a', centre: [0, 3, -6], normal: [0, 0, 1], width: 12, height: 6 } as const;
const spots = (root: Object3D): SpotLight[] => root.children.filter((node) => node instanceof SpotLight);
const lit = (root: Object3D): number => spots(root).filter((light) => light.intensity > 0).length;
/** A stage group in a scene with one layer group, as the scenery is built. */
function stage(): { scene: Scene; root: Group; layer: Group } {
  const [scene, root, layer] = [new Scene(), new Group(), new Group()];
  scene.add(root.add(layer));
  return { scene, root, layer };
}
const solid = (): Mesh => {
  const mesh = new Mesh(new BoxGeometry(14, 9, 9), new MeshStandardMaterial());
  mesh.position.set(0, 4.5, -10);
  return mesh;
};

describe('the wall light pool', () => {
  it('keeps four lights under the stage root, dark when unused, whatever comes and goes', () => {
    const { root, layer } = stage();
    const lights = new LedWallLights([wall, { ...wall, layer: 'b', width: 8 }], [0, 0, 0], venue);
    const other = new Group();
    root.add(other);
    lights.attach('a', layer);
    lights.attach('b', other);
    syncWallLights();
    expect([spots(root).length, lit(root), wallLights().map((light) => light.width)]).toEqual([4, 2, [12, 8]]);
    other.visible = false;
    syncWallLights();
    expect([spots(root).length, lit(root)]).toEqual([4, 1]);
    layer.visible = false;
    syncWallLights();
    expect([spots(root).length, lit(root), wallLights()]).toEqual([4, 0, []]);
    lights.dispose();
    expect(spots(root)).toHaveLength(0);
  });

  it('follows "off" from the frame mesh, which is never culled, also when no wall draws', () => {
    const { root, layer } = stage();
    const lights = new LedWallLights([wall], [0, 0, 0], venue);
    lights.attach('a', layer);
    syncWallLights();
    const beacon = root.children.find((node) => node.name === 'mvr-led-frame');
    expect([beacon?.frustumCulled, lit(root)]).toEqual([false, 1]);
    setLedWallPercent(0);
    // the renderer calls this hook before it draws the mesh; the arguments are not used
    (beacon as { onBeforeRender: () => void } | undefined)?.onBeforeRender();
    expect(lit(root)).toBe(0);
    lights.dispose();
  });

  it('takes the front from the seats: a wall with the audience behind it lights that way', () => {
    const { layer } = stage();
    const lights = new LedWallLights([wall], [0, 0, 0], venue, [0, 0, -30]);
    lights.attach('a', layer);
    syncWallLights();
    expect(wallLights()[0]?.normal).toEqual([-0, -0, -1]);
    lights.dispose();
  });

  it('lights the stage from a marked mesh layer, once for solids that coincide, and stops with the mark', () => {
    const { root, layer } = stage();
    const second = new Group().add(solid());
    root.add(second);
    layer.add(solid());
    const panel = createLedMaterial();
    drawAsLed(layer, panel, true);
    drawAsLed(second, panel, true);
    syncWallLights();
    const [light] = wallLights();
    expect([wallLights().length, lit(root)]).toEqual([1, 1]);
    expect([light?.normal, light?.width, light?.height, light?.position[2]]).toEqual([[0, 0, 1], 14, 9, -5.2]);
    drawAsLed(layer, panel, false);
    syncWallLights();
    expect(lit(root)).toBe(1);
    freeLedMaterials(second);
    syncWallLights();
    expect([wallLights().length, spots(root).length]).toEqual([0, 0]);
  });
});
