import { Box3, Matrix4, type InstancedMesh, type Mesh, type Object3D } from 'three';
import { MVR_LAYER_KEY } from '../../render/mvr/mvrLayerKey';

type Triple = readonly [number, number, number];

/** One drawn MVR layer group: its uuid and the world box of all its meshes, in metres, Y up. */
export interface MvrSceneryBox {
  readonly layer: string;
  readonly min: Triple;
  readonly max: Triple;
}

const isMesh = (o: Object3D): o is Mesh => (o as Partial<Mesh>).isMesh === true;
const isInstanced = (o: Mesh): o is InstancedMesh => (o as Partial<InstancedMesh>).isInstancedMesh === true;

/**
 * The world box of every mesh under `layer`: each instance of an instanced mesh is placed by its own matrix, and a
 * merged mesh carries its placements in its vertices. Each mesh's local box is moved corner by corner, so a turned
 * box mesh gives the box of its turned corners.
 */
function worldBox(layer: Object3D): Box3 {
  layer.updateWorldMatrix(true, true);
  const [box, part, m] = [new Box3(), new Box3(), new Matrix4()];
  layer.traverse((o) => {
    if (!isMesh(o)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const local = o.geometry.boundingBox;
    if (!local) return;
    if (!isInstanced(o)) return void box.union(part.copy(local).applyMatrix4(o.matrixWorld));
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      box.union(part.copy(local).applyMatrix4(m.premultiply(o.matrixWorld)));
    }
  });
  return box;
}

/**
 * Reads the drawn MVR layer groups, for the accuracy spec's independent reader. The boxes are in the world frame, the
 * frame `mvrPlacements` reports in: the fit offset is already in them, as the scenery is drawn with it.
 */
export function mvrSceneryBoxHook({ mvrScene }: { mvrScene: Pick<Object3D, 'traverse'> }): {
  mvrSceneryBoxes(): MvrSceneryBox[];
} {
  return {
    mvrSceneryBoxes: () => {
      const out: MvrSceneryBox[] = [];
      mvrScene.traverse((o) => {
        const layer: unknown = o.userData[MVR_LAYER_KEY];
        if (typeof layer !== 'string') return;
        const { min, max } = worldBox(o);
        out.push({ layer, min: [min.x, min.y, min.z], max: [max.x, max.y, max.z] });
      });
      return out;
    },
  };
}
