import { BoxGeometry, ConeGeometry, CylinderGeometry, MeshBasicMaterial, SphereGeometry, type Object3D } from 'three';
import { terrainHeight } from '../../domain/audienceTerrain';
import { addMesh } from '../shared';
import type { JerusalemStone } from './JerusalemStone';

const TOWER_X = 104;
const TOWER_Z = -28;

/**
 * Builds the Mount Zion silhouette on the right ridge behind the wall: a round tower with four capped turrets and a
 * conical roof with a cross, then a nave with a dark dome.
 */
export function buildMountZion(scene: Object3D, stone: JerusalemStone): void {
  const tx = TOWER_X,
    tz = TOWER_Z,
    tb = terrainHeight(tx, tz) - 2;
  const round = addMesh(scene, new CylinderGeometry(4.2, 4.6, 26, 20), stone.floodlit(8, 26), {
    position: [tx, tb + 13, tz],
  });
  for (let k = 0; k < 4; k++) {
    const turret = addMesh(scene, new CylinderGeometry(1.1, 1.1, 8, 10), round.material, {
      position: [tx + Math.cos(k * 1.57) * 4.4, tb + 22, tz + Math.sin(k * 1.57) * 4.4],
    });
    addMesh(scene, new ConeGeometry(1.25, 2.6, 10), new MeshBasicMaterial({ color: 0x2b3238 }), {
      position: [turret.position.x, tb + 27.3, turret.position.z],
    });
  }
  addMesh(scene, new ConeGeometry(4.9, 9, 20), new MeshBasicMaterial({ color: 0x323b42 }), {
    position: [tx, tb + 30.5, tz],
  });
  const crossMaterial = new MeshBasicMaterial({ color: 0xc9a46c });
  addMesh(scene, new BoxGeometry(0.25, 2.2, 0.25), crossMaterial, { position: [tx, tb + 36, tz] });
  addMesh(scene, new BoxGeometry(22, 12, 14), stone.floodlit(22, 12), { position: [tx + 12, tb + 6, tz + 9] });
  addMesh(
    scene,
    new SphereGeometry(5.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new MeshBasicMaterial({ color: 0x2a3036 }),
    { position: [tx + 14, tb + 12, tz + 9] },
  );
}
