import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry, type Material, type Object3D } from 'three';
import { terrainHeight } from '../../domain/audienceTerrain';
import { addMesh } from '../shared';
import type { JerusalemStone } from './JerusalemStone';

const CITADEL_X = -70;
const CITADEL_Z = -62;

/**
 * Builds the Tower of David on the left ridge: the citadel keep and the minaret (shaft, gallery, upper shaft, dome,
 * spire). The gallery, dome and spire use the crenellation's warm `trim` material, as in the legacy script.
 */
export function buildTowerOfDavid(scene: Object3D, stone: JerusalemStone, trim: Material): void {
  const cx = CITADEL_X,
    cz = CITADEL_Z,
    cb = terrainHeight(cx, cz) - 3;
  addMesh(scene, new BoxGeometry(16, 22, 16), stone.floodlit(16, 22), { position: [cx, cb + 11, cz] });
  const minaret = stone.floodlit(4, 20),
    mx = cx + 4,
    mz = cz + 5;
  addMesh(scene, new CylinderGeometry(1.9, 2.1, 20, 16), minaret, { position: [mx, cb + 32, mz] });
  addMesh(scene, new CylinderGeometry(2.7, 2.7, 0.7, 16), trim, { position: [mx, cb + 39, mz] });
  addMesh(scene, new CylinderGeometry(1.5, 1.6, 5, 16), minaret, { position: [mx, cb + 44.5, mz] });
  addMesh(scene, new SphereGeometry(1.7, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), trim, {
    position: [mx, cb + 47, mz],
  });
  addMesh(scene, new ConeGeometry(0.25, 2.5, 8), trim, { position: [mx, cb + 49.2, mz] });
}
