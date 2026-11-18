import { BoxGeometry, MeshStandardMaterial, type Object3D } from 'three';
import { DECK, STAGE } from '../../domain/venue';
import { addMesh } from '../shared';
import type { VenueMaterials } from './materials';

/** Builds the stage deck (it takes shadows), the black skirt, the front nosing and the back wall. */
export function buildStage(scene: Object3D, materials: VenueMaterials): void {
  const width = STAGE.x1 - STAGE.x0;
  const deck = addMesh(scene, new BoxGeometry(width, DECK, STAGE.z1 - STAGE.z0), materials.deck, {
    position: [0, DECK / 2, (STAGE.z0 + STAGE.z1) / 2],
  });
  deck.receiveShadow = true;
  addMesh(scene, new BoxGeometry(width, DECK - 0.1, 0.05), materials.black, {
    position: [0, (DECK - 0.1) / 2, STAGE.z1 + 0.03],
  });
  // quirk F7 (orig:931): the legacy code passed this material as an argument, so it exists before the nosing geometry
  const nosing = new MeshStandardMaterial({ color: 0x222226 });
  addMesh(scene, new BoxGeometry(width + 0.2, 0.08, 0.2), nosing, { position: [0, DECK + 0.04, STAGE.z1] });
  addMesh(scene, new BoxGeometry(60, 30, 0.5), materials.black, { position: [0, 15, -21.6] });
}
