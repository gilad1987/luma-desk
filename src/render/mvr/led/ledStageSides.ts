import { Box3, Vector3, type Mesh, type Object3D } from 'three';
import { isMesh } from '../isMesh';

/** The name `proxies.ts` gives the mesh that draws the seat proxies. */
const SEAT_MESH = 'mvr-proxy-seat';

/** The name of the mesh that syncs the wall lights on every frame (`ledLightPool`); it is no scenery. */
export const LED_FRAME_MESH = 'mvr-led-frame';

/** Without seats the audience is taken to sit downstage, +Z, as on the desk's own stages. */
const DOWNSTAGE = new Vector3(0, 0, 1);

/** Where the audience and the stage are, as the scenery under one stage root says; world frame. */
export interface StageSides {
  /** The centre of the seat proxies, the evidence of where the audience sits; undefined without seats. */
  readonly seats: Vector3 | undefined;
  /** The middle of all the scenery. */
  readonly middle: Vector3;
}

/** The sides of the stage under `root`. Hidden seat layers count too: hiding the seats does not move the audience. */
export function stageSides(root: Object3D): StageSides {
  const seats = new Box3();
  root.updateWorldMatrix(true, true);
  const all = new Box3();
  root.traverse((node) => {
    if (!isMesh(node) || node.name === LED_FRAME_MESH) return;
    all.expandByObject(node);
    if (node.name === SEAT_MESH) seats.expandByObject(node);
  });
  return {
    seats: seats.isEmpty() ? undefined : seats.getCenter(new Vector3()),
    middle: all.isEmpty() ? new Vector3() : all.getCenter(new Vector3()),
  };
}

/** For one mesh: the level direction to the audience (the seats, else downstage) and the direction to the middle. */
export function directionsOf(mesh: Mesh, sides: StageSides): { toAudience: Vector3; inward: Vector3 } {
  const centre = new Box3().setFromObject(mesh).getCenter(new Vector3());
  const toSeats = sides.seats?.clone().sub(centre).setY(0);
  const toAudience = toSeats && toSeats.lengthSq() > 1e-6 ? toSeats.normalize() : DOWNSTAGE.clone();
  const inward = sides.middle.clone().sub(centre);
  return { toAudience, inward: inward.lengthSq() > 1e-6 ? inward.normalize() : toAudience.clone() };
}
