import { BoxGeometry, MeshStandardMaterial, type Object3D } from 'three';
import { DECK, ROOF, TOWX, TOWZ, TR } from '../../domain/venue';
import { addMesh } from '../shared';
import type { TrussKit } from './TrussKit';

/**
 * Builds the ground-supported roof: the five lighting trusses, the corner and middle towers, the roof frame, the
 * side ladders on the deck and the roof slab, in the legacy order.
 */
export function buildRoofGrid(scene: Object3D, kit: TrussKit): void {
  for (const beam of Object.values(TR)) kit.addSection(scene, [-TOWX, beam.y, beam.z], [TOWX, beam.y, beam.z], 0.52);
  for (const x of [-TOWX, TOWX]) for (const z of TOWZ) kit.addSection(scene, [x, 0, z], [x, ROOF, z], 0.78);
  for (const x of [-TOWX, TOWX]) kit.addSection(scene, [x, 0, -8], [x, ROOF, -8], 0.78);
  for (const x of [-TOWX, TOWX]) kit.addSection(scene, [x, ROOF, TOWZ[0]], [x, ROOF, TOWZ[1]], 0.78);
  kit.addSection(scene, [-TOWX, ROOF, TOWZ[0]], [TOWX, ROOF, TOWZ[0]], 0.78);
  kit.addSection(scene, [-TOWX, ROOF, TOWZ[1]], [TOWX, ROOF, TOWZ[1]], 0.78);
  kit.addSection(scene, [-TOWX, ROOF, -8], [TOWX, ROOF, -8], 0.78);
  for (const sx of [-1, 1])
    for (const z of [-3, -9, -15]) {
      const x = sx * 23.6 + sx * 0.4;
      kit.addSection(scene, [x, DECK, z], [x, 19.5, z], 0.4);
    }
  // quirk F7 (orig:1032): the legacy code passed this material as an argument, so it exists before the slab geometry
  const roof = new MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  addMesh(scene, new BoxGeometry(54, 0.3, 27), roof, { position: [0, ROOF + 0.7, -7.9] });
}
