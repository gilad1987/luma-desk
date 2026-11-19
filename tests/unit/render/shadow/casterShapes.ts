import { BoxGeometry, BufferAttribute, BufferGeometry, Frustum, Group, Matrix4, type Mesh } from 'three';
import { beamFrame, FRAME } from '../../../../src/render/shadow/beamFrame';
import { aimTileCamera, createTileCamera } from '../../../../src/render/shadow/tileFrustum';
import { beamRows, setRow } from './shadowRows';

/** Two 1 m boxes in one geometry, as the scenery merge makes them: one at the origin, one 40 m along x. */
export function mergedBoxes(): BufferGeometry {
  const near = new BoxGeometry(1, 1, 1).toNonIndexed();
  const far = new BoxGeometry(1, 1, 1).toNonIndexed().translate(40, 0, 0);
  const points = new Float32Array([...near.getAttribute('position').array, ...far.getAttribute('position').array]);
  return new BufferGeometry().setAttribute('position', new BufferAttribute(points, 3));
}

/** A root with one layer that holds `node`, as `MvrStage` builds it. */
export function rootWith(node: Mesh): { root: Group; layer: Group } {
  const root = new Group();
  const layer = new Group();
  root.add(layer.add(node));
  return { root, layer };
}

/** The frustum of the tile of a narrow beam straight down at `x`. */
export function frustumAt(x: number): Frustum {
  const rows = beamRows(1);
  setRow(rows, 0, { origin: [x, 8, 0], length: 10, tan: 0.1 });
  const frame = new Float64Array(FRAME);
  beamFrame(rows, 0, frame);
  const camera = createTileCamera();
  aimTileCamera(camera, frame);
  return new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
}
