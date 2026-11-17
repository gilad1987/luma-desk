import { BoxGeometry, MeshStandardMaterial, type Object3D } from 'three';
import { addMesh } from '../shared';

/** Builds the steel crowd barricade in front of the stage: one box per section, each with its own geometry. */
export function buildBarricade(scene: Object3D): void {
  const steel = new MeshStandardMaterial({ color: 0x5c5f66, metalness: 0.8, roughness: 0.4 });
  for (let x = -36; x <= 36; x += 2.05)
    addMesh(scene, new BoxGeometry(2, 1.25, 0.5), steel, { position: [x, 0.62, 6.2] });
}
