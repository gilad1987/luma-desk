import { BoxGeometry, MeshStandardMaterial, type Object3D } from 'three';
import type { StageDeck, StageRiser } from '../../domain/stage/StageDesign';
import { addMesh } from '../shared';
import type { StageMaterials } from './StageSlots';

/**
 * Builds the stage deck (it takes shadows), the black skirt, the front nosing, then one box per riser. The venue's
 * back wall is not part of the deck: it stays when the deck changes size.
 */
export function buildDeck(
  parent: Object3D,
  deck: StageDeck,
  risers: readonly StageRiser[],
  materials: StageMaterials,
): void {
  const { x0, x1, z0, z1, height } = deck;
  const width = x1 - x0,
    x = (x0 + x1) / 2;
  const top = addMesh(parent, new BoxGeometry(width, height, z1 - z0), materials.deck, {
    position: [x, height / 2, (z0 + z1) / 2],
  });
  top.receiveShadow = true;
  addMesh(parent, new BoxGeometry(width, height - 0.1, 0.05), materials.black, {
    position: [x, (height - 0.1) / 2, z1 + 0.03],
  });
  // quirk F7 (orig:931): the legacy code passed this material as an argument, so it exists before the nosing geometry
  const nosing = new MeshStandardMaterial({ color: 0x222226 });
  addMesh(parent, new BoxGeometry(width + 0.2, 0.08, 0.2), nosing, { position: [x, height + 0.04, z1] });
  for (const { at, size } of risers) {
    const riser = addMesh(parent, new BoxGeometry(...size), materials.deck, {
      position: [at[0], at[1] - size[1] / 2, at[2]],
    });
    riser.receiveShadow = true;
  }
}
