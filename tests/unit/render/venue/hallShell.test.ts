/** The desk-made hall: only while the file shows none, sized from the plot, a dark backdrop and a floor beams land on. */
import { Mesh, MeshBasicMaterial, MeshStandardMaterial, Scene, Vector3, type Object3D } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { HOUSE_SHOW_LEVEL, LOOK_BALANCE, keyIrradiance } from '../../../../src/domain/stage/showBalance.ts';
import { SURFACE_GAIN } from '../../../../src/render/lighting/surfacePhotometry.ts';
import { hallRadiance } from '../../../../src/render/lights/hallLevels.ts';
import * as hallShell from '../../../../src/render/venue/hall/hallShell.ts';
import { hallShellBox, showsFileHall } from '../../../../src/render/venue/hall/hallShellPlan.ts';

const { HALL_SHELL, lightHallShell, placeHallShell, setHallShell } = hallShell;
const BOX = { min: [-10, 0, -8], max: [10, 9, 30] } as const;
const KEY = SURFACE_GAIN * keyIrradiance(LOOK_BALANCE.keyLux, [0, 1, 0]);
const shellOf = (scene: Scene): Object3D | undefined => scene.getObjectByName(HALL_SHELL);
const partsOf = (scene: Scene): Mesh[] =>
  (shellOf(scene)?.children ?? []).filter((child): child is Mesh => child instanceof Mesh);

afterEach(() => {
  setHallShell(true);
  lightHallShell(0);
});

describe('the rule of the desk-made hall', () => {
  it('adds no hall to a file that shows its own, and one to an open-air file or a hidden hall', () => {
    expect(showsFileHall(['hall'], [])).toBe(true);
    expect(showsFileHall([], [])).toBe(false);
    expect(showsFileHall(['hall'], ['hall'])).toBe(false);
    expect(showsFileHall(['hall', 'foyer'], ['hall'])).toBe(true);
  });

  it('stands on the desk floor with room at the sides, the ends and over the rig', () => {
    expect(hallShellBox(BOX)).toEqual({ min: [-18, 0, -16], max: [18, 15, 38] });
    const wide = { min: [-40, 0, -10], max: [40, 4, 90] } as const;
    expect(hallShellBox(wide)).toEqual({ min: [-60, 0, -30], max: [60, 12, 110] });
  });
});

describe('placeHallShell', () => {
  it('builds four walls, a ceiling and a floor that face inwards around the planned box', () => {
    const scene = new Scene();
    placeHallShell(scene, BOX);
    scene.updateMatrixWorld(true);
    const centre = new Vector3(0, 7.5, 11);
    const inward = partsOf(scene).map((part) => {
      const normal = new Vector3(0, 0, 1).transformDirection(part.matrixWorld);
      return normal.dot(centre.clone().sub(part.position)) > 0;
    });
    expect([inward.length, inward.every(Boolean)]).toEqual([6, true]);
    expect(partsOf(scene).map((part) => part.position.toArray())).toEqual([
      [-18, 7.5, 11],
      [18, 7.5, 11],
      [0, 7.5, -16],
      [0, 7.5, 38],
      [0, 15, 11],
      [0, -0.03, 11],
    ]);
    placeHallShell(scene, undefined);
    expect(scene.children).toHaveLength(0);
  });

  it('draws the walls as an unlit backdrop in the light of the house, under 3 % of the key, black with it out', () => {
    const scene = new Scene();
    placeHallShell(scene, BOX);
    lightHallShell(HOUSE_SHOW_LEVEL);
    const looks = partsOf(scene).map((part) => part.material);
    const walls = looks.filter((look): look is MeshBasicMaterial => look instanceof MeshBasicMaterial);
    const floor = looks[5];
    expect(walls.map((look) => look.depthWrite || look.color.r / KEY >= 0.03)).toEqual(Array(5).fill(false));
    // the four walls show the work light; the ceiling, over the lights, gets none
    expect(walls.map((look) => look.color.r > 0)).toEqual([true, true, true, true, false]);
    expect(partsOf(scene).map((part) => part.renderOrder)).toEqual([-2, -2, -2, -2, -2, 0]);
    // the floor is a real matt surface, so beams land on it as pools; under the house it stays under 5 % of the key
    expect(floor instanceof MeshStandardMaterial && [floor.roughness, floor.depthWrite]).toEqual([1, true]);
    const up = floor instanceof MeshStandardMaterial ? floor.color.r * hallRadiance(HOUSE_SHOW_LEVEL, [0, 1, 0]) : 1;
    expect(up / KEY).toBeLessThan(0.05);
    lightHallShell(0);
    expect(walls.map((look) => look.color.r)).toEqual([0, 0, 0, 0, 0]);
  });

  it('follows the "Desk hall" choice now and at the next placing', () => {
    const scene = new Scene();
    placeHallShell(scene, BOX);
    setHallShell(false);
    const before = shellOf(scene)?.visible;
    placeHallShell(scene, BOX);
    expect([before, scene.children.length, shellOf(scene)?.visible]).toEqual([false, 1, false]);
    placeHallShell(scene, undefined);
  });
});
