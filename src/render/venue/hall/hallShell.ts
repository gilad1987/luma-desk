import { Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { StageBounds } from '../../../domain/stage/types';
import { hallRadiance } from '../../lights/hallLevels';
import { HALL_FLOOR_COLOR, HALL_FLOOR_DROP, HALL_SHELL_COLOR, hallShellBox } from './hallShellPlan';

/** The name of the shell group, so the scene test hook and a spec can tell the desk's hall from file scenery. */
export const HALL_SHELL = 'mvr-hall-shell';

type Triple = readonly [number, number, number];
type Look = MeshBasicMaterial | MeshStandardMaterial;
const WALL_ALBEDO = new Color(HALL_SHELL_COLOR).r;
/** The way a plane faces, worked out per wall with no object made per frame. */
const facing = new Vector3();

let shell: Group | null = null;
/** The planes of the shell on screen, kept to light and to free them: four walls, the ceiling, the floor. */
let parts: Mesh[] = [];
/** The "Desk hall" choice of the layer list; it is view state of the stage on screen and is never saved. */
let chosen = true;
let house = 0;
let isLit = false; // whether the walls on screen show `house`

/** One plane of `size` (width, height) at `at`: a wall is turned by `turn` about y, the ceiling and floor about x. */
function side(look: Look, size: readonly [number, number], at: Triple, turn: number): void {
  const mesh = new Mesh(new PlaneGeometry(...size), look);
  mesh.position.set(...at);
  if (parts.length >= 4) mesh.rotation.x = turn;
  else mesh.rotation.y = turn;
  // a wall is drawn first and writes no depth, so nothing of the file is ever hidden by it
  if (look instanceof MeshBasicMaterial) mesh.renderOrder = -2;
  parts.push(mesh);
}

function free(): void {
  shell?.removeFromParent();
  for (const part of parts) {
    part.geometry.dispose();
    if (!Array.isArray(part.material)) part.material.dispose();
  }
  [shell, parts] = [null, []];
}

/**
 * Gives the walls and the ceiling the light of the hall at the house level `level` (0..1): what a matt surface of
 * their colour and facing shows under the work lights (`hallRadiance`; the ceiling, which they hang under, gets
 * none). They are a backdrop, drawn unlit in that colour: lit by every light of the rig they cost a third of the
 * frame. They write no depth, so the light pass and the beams pass them by. With the house out they are black.
 * Every frame asks, and the walls change only with the level or with a new shell: else it returns at once.
 */
export function lightHallShell(level: number): void {
  if (level === house && isLit) return;
  [house, isLit] = [level, true];
  for (const { material, rotation } of parts) {
    if (!(material instanceof MeshBasicMaterial)) continue;
    facing.set(0, 0, 1).applyEuler(rotation);
    material.color.setScalar(WALL_ALBEDO * hallRadiance(level, [facing.x, facing.y, facing.z]));
  }
}

/**
 * Puts the desk-made hall around `box` (the box of stage and seats) into `scene`, in place of the one before, or
 * takes it out when `box` is undefined: four walls and a ceiling as a dark backdrop, each one plane that faces
 * inwards, so a camera outside (Wide, Top, Side) looks through the wall; and a matt floor, a real surface on which
 * beams land as pools. It is the desk's, not file data: it hangs beside the scenery, never in it, so the export,
 * the camera boxes and the beam landing, which read the file's own geometry, do not know it.
 */
export function placeHallShell(scene: Object3D, box: StageBounds | undefined): void {
  free();
  if (!box) return;
  const { min, max } = hallShellBox(box);
  const [width, height, depth] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const [x, y, z] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const wall = (): MeshBasicMaterial => new MeshBasicMaterial({ depthWrite: false });
  side(wall(), [depth, height], [min[0], y, z], Math.PI / 2);
  side(wall(), [depth, height], [max[0], y, z], -Math.PI / 2);
  side(wall(), [width, height], [x, y, min[2]], 0);
  side(wall(), [width, height], [x, y, max[2]], Math.PI);
  side(wall(), [width, depth], [x, max[1], z], Math.PI / 2);
  const floor = new MeshStandardMaterial({ color: HALL_FLOOR_COLOR, roughness: 1, metalness: 0 });
  side(floor, [width, depth], [x, -HALL_FLOOR_DROP, z], -Math.PI / 2);
  shell = new Group().add(...parts);
  shell.name = HALL_SHELL;
  shell.visible = chosen;
  isLit = false;
  lightHallShell(house);
  scene.add(shell);
}

/** The hall goes: takes the shell out and puts choice and level back at their start, for the next stage. */
export function resetHallShell(): void {
  free();
  [chosen, house, isLit] = [true, 0, false];
}

/** The "Desk hall" choice: shows or hides the shell of the stage on screen, and of the next placing. */
export function setHallShell(shown: boolean): void {
  chosen = shown;
  if (shell) shell.visible = shown;
}
