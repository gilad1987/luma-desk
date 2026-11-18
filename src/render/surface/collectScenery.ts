import { InstancedMesh, Matrix4, type Object3D } from 'three';
import { InstanceBuilder } from './InstanceBuilder';
import { MeshInstances } from './MeshInstances';
import { isMesh } from './trianglePoints';

/** The scenery of a stage ready for beam rays: its instances, their holders and its triangle count in the world. */
export interface Scenery {
  readonly instances: MeshInstances;
  /**
   * The objects whose visibility gates a mesh, in order; an instance's layer index points here. A holder is the
   * mesh's parent (a layer, or a group in it such as the proxy group), or the mesh itself when it is a layer.
   */
  readonly holders: readonly Object3D[];
  readonly triangleCount: number;
}

/**
 * True when `node` and every ancestor up to `root` are visible and the chain still reaches `root`: three.js draws
 * nothing under a hidden ancestor, so a beam must not land there either. No allocation: it runs on every ray.
 */
export function isShownUnder(node: Object3D | undefined, root: Object3D): boolean {
  let at: Object3D | null | undefined = node;
  while (at !== root) {
    if (!at?.visible) return false;
    at = at.parent;
  }
  return true;
}

/**
 * Reads every mesh under `root` into mesh instances, with the world matrices as they are now. Each direct child of
 * the root is one layer, as `MvrStage` builds them. An instanced mesh gives one instance per placement up to its
 * `count`, a plain mesh one; both share the triangles of their geometry (see `InstanceBuilder`).
 */
export function collectScenery(root: Object3D): Scenery {
  root.updateWorldMatrix(true, true);
  const builder = new InstanceBuilder();
  const world = new Matrix4();
  const holders = new Map<Object3D, number>();
  root.children.forEach((layer) =>
    layer.traverse((node) => {
      const mesh = isMesh(node) ? builder.meshOf(node.geometry) : null;
      if (!mesh) return;
      const holder = node === layer ? node : (node.parent ?? node);
      const index = holders.get(holder) ?? holders.size;
      holders.set(holder, index);
      const count = node instanceof InstancedMesh ? node.count : 1;
      for (let i = 0; i < count; i++) {
        if (node instanceof InstancedMesh) node.getMatrixAt(i, world);
        else world.identity();
        builder.add(mesh, world.premultiply(node.matrixWorld), index);
      }
    }),
  );
  const instances = new MeshInstances(builder.list(), holders.size);
  return { instances, holders: [...holders.keys()], triangleCount: builder.triangleCount };
}
