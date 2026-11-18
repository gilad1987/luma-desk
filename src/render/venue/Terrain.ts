import type { Object3D } from 'three';
import { buildHills } from './Hills';
import { JerusalemStone } from './JerusalemStone';
import { buildPoolFloor } from './PoolFloor';
import { buildTerraces } from './Terraces';

/**
 * Builds the ground of Sultan's Pool: pool floor, stone textures, retaining walls and terraces, then the hills. The
 * stone textures are created between the floor and the walls, as in the legacy script (uuid order). It returns the
 * stone so the Old City walls reuse the same floodlit texture.
 */
export function buildTerrain(scene: Object3D): JerusalemStone {
  buildPoolFloor(scene);
  const stone = new JerusalemStone();
  buildTerraces(scene, stone);
  buildHills(scene);
  return stone;
}
