import { BoxGeometry, type Material, type Object3D } from 'three';
import { DECK, DELAYS, TOWERS } from '../../domain/venue';
import { addMesh } from '../shared';
import type { TrussKit } from './TrussKit';

/**
 * Builds the standing truss towers: the two delay speaker towers in the audience (base plate and speaker head), then
 * the light towers on the deck (base plate, top plate and a mid shelf for the fixture).
 */
export function buildTrussTowers(scene: Object3D, kit: TrussKit, dark: Material): void {
  for (const [x, z] of DELAYS) {
    kit.addSection(scene, [x, 0, z], [x, 11, z], 0.6);
    addMesh(scene, new BoxGeometry(1.8, 0.1, 1.8), kit.steel, { position: [x, 0.05, z] });
    addMesh(scene, new BoxGeometry(1.6, 1.4, 1.2), dark, { position: [x, 11.2, z] });
  }
  for (const [x, z, H] of TOWERS) {
    kit.addSection(scene, [x, DECK, z], [x, DECK + H, z], 0.46);
    addMesh(scene, new BoxGeometry(1.3, 0.08, 1.3), kit.steel, { position: [x, DECK + 0.04, z] });
    addMesh(scene, new BoxGeometry(0.7, 0.06, 0.7), kit.steel, { position: [x, DECK + H + 0.03, z] });
    addMesh(scene, new BoxGeometry(0.5, 0.05, 0.5), kit.steel, { position: [x, DECK + H * 0.55 - 0.45, z + 0.45] });
  }
}
