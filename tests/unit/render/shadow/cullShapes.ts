import { Box3, Frustum, Matrix4, Sphere, Vector3, type Camera, type Mesh } from 'three';
import { beamFrame, FRAME } from '../../../../src/render/shadow/beamFrame';
import { tileVolume, VOLUME } from '../../../../src/render/shadow/tileCull';
import { aimTileCamera, createTileCamera } from '../../../../src/render/shadow/tileFrustum';
import { beamRows, setRow } from './shadowRows';

/** The tile camera of a beam straight down from (x, y, 0). */
export function tileCameraAt(x: number, y = 8, length = 10, tan = 0.1): Camera {
  const rows = beamRows(1);
  setRow(rows, 0, { origin: [x, y, 0], length, tan });
  const frame = new Float64Array(FRAME);
  beamFrame(rows, 0, frame);
  const camera = createTileCamera();
  aimTileCamera(camera, frame);
  return camera;
}

export function volumeOf(camera: Camera): Float64Array {
  const volume = new Float64Array(VOLUME);
  tileVolume(camera, volume);
  return volume;
}

/** What casts in the reference rule: a world box and the triangles drawn with it. */
export interface OldItem {
  readonly box: Box3;
  readonly triangles: number;
}

/** Every triangle of a mesh as an item of its own. */
export function triangleItems(mesh: Mesh): OldItem[] {
  const position = mesh.geometry.getAttribute('position');
  const index = mesh.geometry.getIndex();
  const corners = index ? index.count : position.count;
  const items: OldItem[] = [];
  const point = new Vector3();
  for (let t = 0; t + 2 < corners; t += 3) {
    const box = new Box3();
    for (let c = t; c < t + 3; c++) {
      box.expandByPoint(point.fromBufferAttribute(position, index ? index.getX(c) : c).applyMatrix4(mesh.matrixWorld));
    }
    items.push({ box, triangles: 1 });
  }
  return items;
}

/** A whole mesh as one item, as one placement of an instanced body is. */
export function bodyItem(mesh: Mesh): OldItem {
  const corners = mesh.geometry.getIndex()?.count ?? mesh.geometry.getAttribute('position').count;
  return { box: new Box3().setFromObject(mesh), triangles: Math.floor(corners / 3) };
}

/**
 * The culling rule before the fix, kept as the reference: every item is in the 4 m cell of its centre, the box of
 * the cell grows to its items, and three.js draws the cell when the sphere around that box is not wholly behind one
 * of the six planes of the tile camera. Returns the triangles drawn.
 */
export function oldDrawn(camera: Camera, items: readonly OldItem[], cell = 4): number {
  const view = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const frustum = new Frustum().setFromProjectionMatrix(view);
  const cells = new Map<string, { box: Box3; triangles: number }>();
  const centre = new Vector3();
  for (const item of items) {
    item.box.getCenter(centre);
    const key = `${Math.floor(centre.x / cell)},${Math.floor(centre.y / cell)},${Math.floor(centre.z / cell)}`;
    const group = cells.get(key) ?? { box: new Box3(), triangles: 0 };
    cells.set(key, group);
    group.box.union(item.box);
    group.triangles += item.triangles;
  }
  const sphere = new Sphere();
  let drawn = 0;
  for (const { box, triangles } of cells.values()) {
    if (frustum.intersectsSphere(box.getBoundingSphere(sphere))) drawn += triangles;
  }
  return drawn;
}
