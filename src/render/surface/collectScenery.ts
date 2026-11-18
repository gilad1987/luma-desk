import { InstancedMesh, Matrix4, type Object3D } from 'three';
import { InstanceBuilder } from './InstanceBuilder';
import { MeshInstances } from './MeshInstances';
import { isMesh } from './trianglePoints';

/** The scenery of a stage ready for beam rays: its instances, its layer objects and its triangle count in the world. */
export interface Scenery {
  readonly instances: MeshInstances;
  /** The direct children of the root, in order; an instance's layer index points here. */
  readonly layers: readonly Object3D[];
  readonly triangleCount: number;
}

/**
 * Reads every mesh under `root` into mesh instances, with the world matrices as they are now. Each direct child of
 * the root is one layer, as `MvrStage` builds them. An instanced mesh gives one instance per placement, a plain mesh
 * one; both share the triangles of their geometry (see `InstanceBuilder`).
 */
export function collectScenery(root: Object3D): Scenery {
  root.updateWorldMatrix(true, true);
  const builder = new InstanceBuilder();
  const world = new Matrix4();
  root.children.forEach((child, layerIndex) =>
    child.traverse((node) => {
      const mesh = isMesh(node) ? builder.meshOf(node.geometry) : null;
      if (!mesh) return;
      const count = node instanceof InstancedMesh ? node.count : 1;
      for (let i = 0; i < count; i++) {
        if (node instanceof InstancedMesh) node.getMatrixAt(i, world);
        else world.identity();
        builder.add(mesh, world.premultiply(node.matrixWorld), layerIndex);
      }
    }),
  );
  const instances = new MeshInstances(builder.list(), root.children.length);
  return { instances, layers: [...root.children], triangleCount: builder.triangleCount };
}
