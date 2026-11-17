import { BoxGeometry, type Object3D } from 'three';
import { VEN } from '../../domain/audienceTerrain';
import { STAGE } from '../../domain/venue';
import { addMesh } from '../shared';
import type { JerusalemStone } from './JerusalemStone';

/** Builds the pool's two stone retaining walls and the stepped seating terraces behind the pool floor. */
export function buildTerraces(scene: Object3D, stone: JerusalemStone): void {
  for (const sx of [-1, 1]) {
    const length = VEN.Z1 - STAGE.z0 + 8;
    addMesh(scene, new BoxGeometry(2, VEN.WH, length), stone.terrace(length, VEN.WH), {
      position: [sx * (VEN.X + 1), VEN.WH / 2, (VEN.Z1 + STAGE.z0) / 2],
    });
  }
  const stepMaterial = stone.terrace(VEN.X * 2, 1.4);
  for (let k = 0; k < VEN.STEPS; k++) {
    const y = (k + 1) * VEN.RISE,
      z = VEN.Z1 + k * VEN.RUN;
    const step = addMesh(scene, new BoxGeometry(VEN.X * 2 + 4, y, VEN.RUN), stepMaterial, {
      position: [0, y / 2, z + VEN.RUN / 2],
    });
    step.receiveShadow = true;
  }
}
