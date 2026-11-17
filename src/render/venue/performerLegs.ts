import { BoxGeometry, CylinderGeometry, type Group, type Material } from 'three';
import { addMesh } from '../shared';

/** The four chair leg positions under a seated player. */
const CHAIR_LEGS: readonly (readonly [x: number, z: number])[] = [
  [-0.2, -0.18],
  [0.2, -0.18],
  [-0.2, 0.2],
  [0.2, 0.2],
];

/**
 * Adds a performer's legs: two straight legs when standing; when seated, thighs and shins plus the chair (seat, back
 * and four thin legs) in `chair` material.
 */
export function addPerformerLegs(body: Group, cloth: Material, chair: Material, seated: boolean, hip: number): void {
  if (!seated) {
    for (const sx of [-0.11, 0.11])
      addMesh(body, new CylinderGeometry(0.065, 0.055, hip, 8), cloth, { position: [sx, hip / 2, 0] });
    return;
  }
  for (const sx of [-0.11, 0.11]) {
    addMesh(body, new BoxGeometry(0.13, 0.13, 0.45), cloth, { position: [sx, hip, 0.2] });
    addMesh(body, new BoxGeometry(0.12, 0.48, 0.12), cloth, { position: [sx, 0.24, 0.42] });
  }
  addMesh(body, new BoxGeometry(0.46, 0.05, 0.44), chair, { position: [0, hip - 0.1, 0.02] });
  addMesh(body, new BoxGeometry(0.46, 0.5, 0.04), chair, { position: [0, hip + 0.14, -0.2] });
  for (const [lx, lz] of CHAIR_LEGS)
    addMesh(body, new CylinderGeometry(0.012, 0.012, hip - 0.12, 5), chair, { position: [lx, (hip - 0.12) / 2, lz] });
}
