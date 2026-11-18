import { BoxGeometry, type Material, type Object3D } from 'three';
import { addMesh } from '../shared';

/** Builds the black wall behind the stage; it belongs to the venue, so it stays when the deck changes. */
export function buildBackWall(scene: Object3D, black: Material): void {
  addMesh(scene, new BoxGeometry(60, 30, 0.5), black, { position: [0, 15, -21.6] });
}
