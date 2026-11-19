import { Box3, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';

const isMesh = (o: Object3D): o is Mesh<BufferGeometry, Material | Material[]> => o instanceof Mesh;

/**
 * The world box of every visible mesh under `root`. `Box3.setFromObject` also counts hidden meshes (a mover's
 * unused vents, a hidden row), which would shift the placement and the camera framing.
 */
export function measureVisible(root: Object3D): Box3 {
  root.updateWorldMatrix(true, true);
  const box = new Box3(),
    part = new Box3();
  root.traverseVisible((o) => {
    if (!isMesh(o)) return;
    const geometry = o.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(part.copy(geometry.boundingBox).applyMatrix4(o.matrixWorld));
  });
  return box;
}
