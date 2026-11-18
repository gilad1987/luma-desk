import { BoxGeometry, InstancedMesh, Matrix4, MeshStandardMaterial, type Object3D } from 'three';
import type { CrowdLayout } from './crowdLayout';

/** Builds the pool-floor chairs as three instanced meshes (seats, backs, leg frames), one instance per chair. */
export function buildChairs(scene: Object3D, chairs: CrowdLayout['chairs']): void {
  const seat = new BoxGeometry(0.46, 0.05, 0.44).translate(0, 0.45, 0),
    back = new BoxGeometry(0.46, 0.42, 0.04).translate(0, 0.72, 0.21),
    legs = new BoxGeometry(0.42, 0.43, 0.38).translate(0, 0.215, 0);
  const shell = new MeshStandardMaterial({ color: 0x26262c, roughness: 0.6, metalness: 0.2 }),
    frame = new MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.8, transparent: true, opacity: 0.55 });
  const meshes = [
      new InstancedMesh(seat, shell, chairs.length),
      new InstancedMesh(back, shell, chairs.length),
      new InstancedMesh(legs, frame, chairs.length),
    ],
    matrix = new Matrix4();
  chairs.forEach(([x, z], i) => {
    matrix.makeTranslation(x, 0, z);
    meshes.forEach((m) => m.setMatrixAt(i, matrix));
  });
  meshes.forEach((m) => scene.add(m));
}
