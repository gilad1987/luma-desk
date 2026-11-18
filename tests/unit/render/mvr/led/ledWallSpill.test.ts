/**
 * The light an LED wall throws on the hall, against the balance of the first look: a soft tint on the first rows,
 * never a second key. And the wall lights start with the stage, also when the first wall is hidden at that moment.
 */
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Scene, SpotLight, type Object3D } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { ledPaletteOf } from '../../../../../src/app/mvr/ledLookPalette.ts';
import { LOOK_BALANCE, WALL_SPILL_LIMIT, keyIrradiance } from '../../../../../src/domain/stage/showBalance.ts';
import { SURFACE_GAIN } from '../../../../../src/render/lighting/surfacePhotometry.ts';
import { drawAsLed, freeLedMaterials } from '../../../../../src/render/mvr/led/ledLayerLook.ts';
import { LED_DEFAULT_PERCENT } from '../../../../../src/render/mvr/led/ledLevel.ts';
import { syncWallLights } from '../../../../../src/render/mvr/led/ledLightPool.ts';
import { createLedMaterial } from '../../../../../src/render/mvr/led/ledMaterial.ts';
import { ledUniforms, setLedPalette, setLedWallPercent } from '../../../../../src/render/mvr/led/ledUniforms.ts';

const WHITE = [1, 1, 1] as const;
const spots = (root: Object3D): SpotLight[] => root.children.filter((node) => node instanceof SpotLight);

/** A stage with one layer that holds a 14 x 9 m solid, marked as an LED wall. */
function markedWall(): { root: Group; layer: Group } {
  const [root, layer] = [new Group(), new Group()];
  const solid = new Mesh(new BoxGeometry(14, 9, 1), new MeshStandardMaterial());
  solid.position.set(0, 4.5, -10);
  new Scene().add(root.add(layer.add(solid)));
  drawAsLed(layer, createLedMaterial(), true);
  return { root, layer };
}

/** The radiance of a white matt surface that faces the brightest wall light from `metres` off, as the renderer has it. */
const spill = (root: Object3D, metres: number): number =>
  Math.max(...spots(root).map((light) => light.intensity)) / metres ** 2 / Math.PI;

/** The same surface under the key of the first look, turned to the key as much as the deck is. */
const key = SURFACE_GAIN * keyIrradiance(LOOK_BALANCE.keyLux, [0, 1, 0]);

afterEach(() => {
  setLedWallPercent(LED_DEFAULT_PERCENT);
  setLedPalette([]);
  ledUniforms.uLedTime.value = 0;
});

describe('the spill of an LED wall', () => {
  it('stays under the stated share of the key 15 m from a 14 x 9 m wall, through a minute of content', () => {
    setLedWallPercent(LED_DEFAULT_PERCENT);
    for (const fixtures of [12, 60, 300]) {
      setLedPalette(ledPaletteOf(fixtures));
      const { root, layer } = markedWall();
      for (let seconds = 0; seconds <= 60; seconds += 5) {
        ledUniforms.uLedTime.value = seconds;
        syncWallLights();
        expect(spill(root, 15)).toBeGreaterThan(0);
        expect(spill(root, 15) / key).toBeLessThan(WALL_SPILL_LIMIT);
      }
      freeLedMaterials(layer);
    }
  });

  it('is below the key even for content of white fields, and grows with the wall level', () => {
    setLedPalette([WHITE, WHITE, WHITE]);
    const { root, layer } = markedWall();
    syncWallLights();
    const atStart = spill(root, 15);
    expect(atStart / key).toBeLessThan(0.5);
    setLedWallPercent(LED_DEFAULT_PERCENT * 2);
    syncWallLights();
    expect(spill(root, 15)).toBeCloseTo(atStart * 2);
    freeLedMaterials(layer);
  });

  it('brings the light set for a wall that is hidden, so the set sees the wall come on screen', () => {
    const { root, layer } = markedWall();
    layer.visible = false;
    syncWallLights();
    const beacon = root.children.find((node) => node.name === 'mvr-led-frame');
    expect([spots(root).length, spill(root, 15), beacon === undefined]).toEqual([4, 0, false]);
    layer.visible = true;
    // the renderer calls this hook before it draws the mesh; the arguments are not used
    (beacon as { onBeforeRender: () => void } | undefined)?.onBeforeRender();
    expect(spill(root, 15)).toBeGreaterThan(0);
    freeLedMaterials(layer);
  });
});
