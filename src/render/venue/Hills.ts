import { BufferAttribute, MeshStandardMaterial, PlaneGeometry, type Object3D } from 'three';
import { terrH, VEN } from '../../domain/audienceTerrain';
import { STAGE } from '../../domain/venue';
import { addMesh } from '../shared';

/**
 * Builds the Hinnom valley hills around the pool: a 460 m grid shaped by `terrH`, sunk under the bowl, with random
 * earth and olive-grove vertex colours (`Math.random` twice per vertex).
 */
export function buildHills(scene: Object3D): void {
  const geometry = new PlaneGeometry(460, 460, 150, 150);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, 20);
  const position = geometry.getAttribute('position'),
    colours = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      z = position.getZ(i),
      h = terrH(x, z),
      inside = Math.abs(x) < VEN.X + 2 && z > STAGE.z0 - 12 && z < VEN.Z1 + VEN.STEPS * VEN.RUN;
    position.setY(i, inside ? -0.5 : h);
    const r = Math.random() * 0.03,
      olive = Math.random() < 0.25;
    colours.set(olive ? [0.07 + r, 0.085 + r, 0.05 + r] : [0.11 + r, 0.095 + r, 0.075 + r], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  addMesh(scene, geometry, new MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
}
