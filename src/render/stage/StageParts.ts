import { InstancedMesh, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { Disposer, type DisposableResource } from '../shared';

const isMesh = (o: Object3D): o is Mesh<BufferGeometry, Material | Material[]> => o instanceof Mesh;

/**
 * The scene objects that one stage build added, so a rebuild takes exactly those out of the scene and frees the
 * geometry and materials only they use. The builders add straight to the scene (no wrapping group: a group would
 * draw extra random numbers at boot), so the parts are found as the children a build appended.
 */
export class StageParts {
  readonly #disposer = new Disposer();
  #roots: Object3D[] = [];

  /** Runs `build` and records every child it appended to `parent`. */
  capture(parent: Object3D, build: () => void): void {
    const from = parent.children.length;
    build();
    this.#roots.push(...parent.children.slice(from));
  }

  /** Takes every recorded object out of the scene and disposes what it owns, except the `shared` resources. */
  dispose(shared: ReadonlySet<DisposableResource>): void {
    for (const root of this.#roots) {
      root.removeFromParent();
      root.traverse((o) => this.#trackOwned(o, shared));
    }
    this.#disposer.dispose();
    this.#roots = [];
  }

  #trackOwned(o: Object3D, shared: ReadonlySet<DisposableResource>): void {
    if (!isMesh(o)) return;
    const { geometry, material } = o;
    // an instanced mesh owns its instance matrix buffer on the GPU
    if (o instanceof InstancedMesh) this.#disposer.track(o);
    const resources: DisposableResource[] = [geometry, ...(Array.isArray(material) ? material : [material])];
    for (const r of resources) if (!shared.has(r)) this.#disposer.track(r);
  }
}
