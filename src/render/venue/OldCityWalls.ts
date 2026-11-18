import { BoxGeometry, MeshBasicMaterial, PointLight, type Object3D } from 'three';
import { buildCrenellation } from './crenellation';
import { buildJaffaGate } from './JaffaGate';
import type { JerusalemStone } from './JerusalemStone';
import { buildMountZion } from './MountZion';
import { buildRidgeWalls } from './ridgeWalls';
import { buildTowerOfDavid } from './TowerOfDavid';

/**
 * Builds the floodlit Old City on the ridges: wall lines, Jaffa Gate, Mount Zion, the crenellation, the Tower of
 * David and a warm floodlight. It returns the floodlight: the fixture sync forces its intensity to 0 every frame
 * (quirk F1, kept for parity), so it needs the handle.
 */
export function buildOldCityWalls(scene: Object3D, stone: JerusalemStone): PointLight {
  const merlonGeometry = new BoxGeometry(0.9, 1.3, 2.3),
    trim = new MeshBasicMaterial({ color: 0xc9a46c });
  const merlons = [...buildRidgeWalls(scene, stone), ...buildJaffaGate(scene, stone)];
  buildMountZion(scene, stone);
  buildCrenellation(scene, merlonGeometry, trim, merlons);
  buildTowerOfDavid(scene, stone, trim);
  const floodlight = new PointLight(0xffb060, 0, 140, 1.4); // quirk F1 (orig:1000): always off
  floodlight.position.set(-66, 30, -10);
  scene.add(floodlight);
  return floodlight;
}
