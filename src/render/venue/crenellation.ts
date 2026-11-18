import { InstancedMesh, Matrix4, Quaternion, Vector3, type BoxGeometry, type Material, type Object3D } from 'three';
import { UP } from '../../domain/venue';

/** Where one merlon of the Old City crenellation stands, and its turn about the up axis in radians. */
export type CrenelPlacement = readonly [x: number, y: number, z: number, angle: number];

/**
 * Builds all merlons of the walls, gate and towers as one instanced mesh, so hundreds of blocks cost one draw call.
 * The landmark builders collect the placements; this runs after Mount Zion, as in the legacy script.
 */
export function buildCrenellation(
  scene: Object3D,
  geometry: BoxGeometry,
  material: Material,
  placements: readonly CrenelPlacement[],
): void {
  const merlons = new InstancedMesh(geometry, material, placements.length),
    matrix = new Matrix4(),
    turn = new Quaternion();
  placements.forEach(([x, y, z, angle], i) => {
    turn.setFromAxisAngle(UP, angle);
    matrix.compose(new Vector3(x, y, z), turn, new Vector3(1, 1, 1));
    merlons.setMatrixAt(i, matrix);
  });
  scene.add(merlons);
}
