/** A stage of seat proxies for the audience tests, and readers for the audience meshes built on it. */
import { Group, InstancedMesh, Matrix4, type Object3D } from 'three';
import { PROXY_GROUP } from '../../../../../src/render/mvr/proxies.ts';
import { proxyGeometry, proxyMaterial } from '../../../../../src/render/mvr/proxiesShapes.ts';
import { AUDIENCE_GROUP } from '../../../../../src/render/venue/audience/figureSlot.ts';

export const PITCH = 0.54;
const roots: Group[] = [];

/** A stage with one layer of `seats` seat proxies in a row along X, as `proxies.ts` builds them. */
export function seatStage(seats: number): Group {
  const mesh = new InstancedMesh(proxyGeometry('seat'), proxyMaterial('seat'), seats);
  const size = new Matrix4().makeScale(PITCH, 1, PITCH);
  for (let i = 0; i < seats; i++) mesh.setMatrixAt(i, new Matrix4().makeTranslation(i * PITCH, 0.2, 3).multiply(size));
  mesh.name = 'mvr-proxy-seat';
  const holder = new Group().add(mesh);
  holder.name = PROXY_GROUP;
  const root = new Group().add(holder);
  roots.push(root);
  return root;
}

const isInstanced = (node: Object3D): node is InstancedMesh => node instanceof InstancedMesh;

/** The audience meshes under `root`: per body one near and one far mesh. */
export function figureMeshes(root: Object3D): InstancedMesh[] {
  const found: InstancedMesh[] = [];
  root.traverse((node) => {
    if (isInstanced(node) && node.name.startsWith(AUDIENCE_GROUP)) found.push(node);
  });
  return found;
}

/** The figures drawn under `root`, of one level of detail when `detail` names it. */
export const drawn = (root: Object3D, detail = ''): number =>
  figureMeshes(root).reduce((sum, mesh) => sum + (mesh.name.endsWith(detail) ? mesh.count : 0), 0);

/** The instance matrices in use, per mesh. */
export const matrices = (root: Object3D): number[][] =>
  figureMeshes(root).map((mesh) => Array.from(mesh.instanceMatrix.array.slice(0, mesh.count * 16)));

/** Frees the audience of every stage made here, as a stage change does; the module keeps its layers until then. */
export function freeStages(): void {
  for (const root of roots.splice(0)) figureMeshes(root).forEach((mesh) => mesh.dispose());
}
