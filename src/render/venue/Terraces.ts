import { BoxGeometry, type Object3D } from 'three';
import { AUDIENCE_TERRAIN } from '../../domain/audienceTerrain';
import { STAGE } from '../../domain/venue';
import { addMesh } from '../shared';
import type { JerusalemStone } from './JerusalemStone';

/** Builds the pool's two stone retaining walls and the stepped seating terraces behind the pool floor. */
export function buildTerraces(scene: Object3D, stone: JerusalemStone): void {
  for (const sx of [-1, 1]) {
    const length = AUDIENCE_TERRAIN.Z1 - STAGE.z0 + 8;
    addMesh(scene, new BoxGeometry(2, AUDIENCE_TERRAIN.WH, length), stone.terrace(length, AUDIENCE_TERRAIN.WH), {
      position: [sx * (AUDIENCE_TERRAIN.X + 1), AUDIENCE_TERRAIN.WH / 2, (AUDIENCE_TERRAIN.Z1 + STAGE.z0) / 2],
    });
  }
  const stepMaterial = stone.terrace(AUDIENCE_TERRAIN.X * 2, 1.4);
  for (let k = 0; k < AUDIENCE_TERRAIN.STEPS; k++) {
    const y = (k + 1) * AUDIENCE_TERRAIN.RISE,
      z = AUDIENCE_TERRAIN.Z1 + k * AUDIENCE_TERRAIN.RUN;
    const step = addMesh(scene, new BoxGeometry(AUDIENCE_TERRAIN.X * 2 + 4, y, AUDIENCE_TERRAIN.RUN), stepMaterial, {
      position: [0, y / 2, z + AUDIENCE_TERRAIN.RUN / 2],
    });
    step.receiveShadow = true;
  }
}
