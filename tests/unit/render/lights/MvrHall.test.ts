/** The hall of an imported stage: the work light, and the desk's shell while no hall layer of the file is shown. */
import { Group, Mesh, MeshBasicMaterial, Scene, type Object3D } from 'three';
import { afterEach, expect, it } from 'vitest';
import { MvrHall } from '../../../../src/render/lights/MvrHall.ts';
import { HALL_SHELL, lightHallShell } from '../../../../src/render/venue/hall/hallShell.ts';

const BOX = { min: [-10, 0, -8], max: [10, 9, 30] } as const;
const shellOf = (scene: Scene): Object3D | undefined => scene.getObjectByName(HALL_SHELL);

afterEach(() => lightHallShell(0));

it('stands the shell beside the scenery while no hall layer of the file is shown, and frees it on hide', () => {
  const scene = new Scene();
  const scenery = new Group();
  scene.add(scenery);
  const hall = new MvrHall(scene);
  hall.show(BOX);
  // the export, the camera boxes and the beam landing read the scenery group: the shell is not in it
  expect([shellOf(scene)?.parent === scene, scenery.children.length]).toEqual([true, 0]);
  // one probe hands the renderer over for the hall map; a second show adds no second one
  const probes = (): number => scene.children.filter((child) => child instanceof Mesh).length;
  hall.show(BOX);
  expect(probes()).toBe(1);
  hall.place(BOX, ['hall'], []);
  // a rebuild of the same stage shows the hall light again: the file's hall still stands, so no shell
  hall.show(BOX);
  expect(shellOf(scene)).toBeUndefined();
  hall.place(BOX, ['hall'], ['hall']);
  expect(shellOf(scene)?.children).toHaveLength(6);
  hall.hide();
  expect(scene.children).toEqual([scenery]);
});

it('lights the walls of the shell with the house level, and adds nothing while the hall is off', () => {
  const scene = new Scene();
  const hall = new MvrHall(scene);
  // a built-in stage: the hall is off, so a fit or a level makes no shell
  hall.place(BOX, [], []);
  hall.setLevel(1);
  expect(scene.children).toHaveLength(0);
  hall.show(BOX);
  hall.setLevel(1);
  const walls = (shellOf(scene)?.children ?? []).filter((child): child is Mesh => child instanceof Mesh);
  const look = walls[0]?.material;
  expect(look instanceof MeshBasicMaterial && look.color.r > 0).toBe(true);
  hall.setLevel(0);
  expect(look instanceof MeshBasicMaterial && look.color.r).toBe(0);
  hall.hide();
});
