import { BoxGeometry, Group, MeshStandardMaterial, PlaneGeometry, type Material, type Object3D } from 'three';
import { addMesh } from '../shared';

const BOXES_PER_HANG = 16;

/** One curved line-array hang: 16 boxes, each with its own grill material, splayed a little more per box. */
function buildHang(dark: Material): Group {
  const hang = new Group();
  for (let i = 0; i < BOXES_PER_HANG; i++) {
    addMesh(hang, new BoxGeometry(1.4, 0.44, 1.2), dark, { position: [0, -i * 0.46, 0], rotation: [i * 0.02, 0, 0] });
    addMesh(hang, new PlaneGeometry(1.3, 0.36), new MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.95 }), {
      position: [0, -i * 0.46, 0.61],
      rotation: [i * 0.02, 0, 0],
    });
  }
  return hang;
}

/** Builds the PA: two line-array hangs per side, angled toward the audience, and four ground subs per side. */
export function buildPaHangs(scene: Object3D, dark: Material): void {
  for (const sx of [-1, 1]) {
    for (const off of [0, 3.2]) {
      const hang = buildHang(dark);
      hang.position.set(sx * (29 + off), 21.5, 3 - off * 0.5);
      hang.rotation.y = -sx * (0.12 + off * 0.05);
      scene.add(hang);
    }
    for (let i = 0; i < 4; i++)
      addMesh(scene, new BoxGeometry(1.5, 1.2, 1.4), dark, { position: [sx * (28 - i * 1.6), 0.6, 3.4] });
  }
}
