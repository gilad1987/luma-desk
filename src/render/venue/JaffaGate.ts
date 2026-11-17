import { BoxGeometry, CircleGeometry, MeshBasicMaterial, PlaneGeometry, type Object3D } from 'three';
import { terrainHeight } from '../../domain/audienceTerrain';
import { addMesh } from '../shared';
import type { CrenelPlacement } from './crenellation';
import type { JerusalemStone } from './JerusalemStone';

const GATE_X = 83.5;
const GATE_Z = 15;
const GATE_HEIGHT = 22;

/** The merlon offsets on the gatehouse roof. */
const GATE_MERLONS: readonly (readonly [dx: number, dz: number])[] = [
  [-5, -6],
  [-5, -2],
  [-5, 2],
  [-5, 6],
  [5, -6],
  [5, 6],
  [0, -6],
  [0, 6],
];

/**
 * Builds the gatehouse on the right ridge (Jaffa Gate style) with a dark arched opening that faces the venue. It
 * returns the gatehouse merlon placements.
 */
export function buildJaffaGate(scene: Object3D, stone: JerusalemStone): CrenelPlacement[] {
  const gb = terrainHeight(GATE_X, GATE_Z) - 3,
    H = GATE_HEIGHT;
  addMesh(scene, new BoxGeometry(11, H, 13), stone.floodlit(11, H), { position: [GATE_X, gb + H / 2, GATE_Z] });
  const arch = addMesh(scene, new PlaneGeometry(4.2, 7), new MeshBasicMaterial({ color: 0x0b0806 }), {
    position: [GATE_X - 5.52, gb + 3 + 3.5, GATE_Z],
    rotation: [0, -Math.PI / 2, 0],
  });
  addMesh(scene, new CircleGeometry(2.1, 20, 0, Math.PI), arch.material, {
    position: [GATE_X - 5.52, gb + 10, GATE_Z],
    rotation: [0, -Math.PI / 2, 0],
  });
  return GATE_MERLONS.map(([dx, dz]) => [GATE_X + dx, gb + H + 0.65, GATE_Z + dz, Math.PI / 2]);
}
