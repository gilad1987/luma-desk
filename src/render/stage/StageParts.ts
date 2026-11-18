import { InstancedMesh, Line, Mesh, Points, Texture, type BufferGeometry, type Material, type Object3D } from 'three';
import { Disposer, type DisposableResource } from '../shared';

/** An object that draws a geometry with a material: a mesh, the sky's star points or a line. */
type Drawable = Mesh<BufferGeometry, Material | Material[]> | Points | Line;

const isDrawable = (o: Object3D): o is Drawable => o instanceof Mesh || o instanceof Points || o instanceof Line;

/** The textures a material holds in its own fields (`map`, `emissiveMap`, ...) and in its shader uniforms. */
function texturesOf(material: Material): Texture[] {
  const uniforms = 'uniforms' in material ? Object.values(material.uniforms as Record<string, { value: unknown }>) : [];
  const values = [...Object.values(material as unknown as Record<string, unknown>), ...uniforms.map((u) => u.value)];
  return values.filter((v): v is Texture => v instanceof Texture);
}

/**
 * The scene objects that one build added, so a rebuild takes exactly those out of the scene and frees the geometry,
 * materials and textures only they use. The builders add straight to the scene (no wrapping group: a group would
 * draw extra random numbers at boot), so the parts are found as the children a build appended.
 */
export class StageParts {
  readonly #disposer = new Disposer();
  #roots: Object3D[] = [];

  /**
   * Runs `build` and records every child it appended to `parent`, also when it throws: no part escapes a dispose.
   * `isForeign` leaves out children that another owner records (the venue build appends the stage parts too).
   */
  capture(parent: Object3D, build: () => void, isForeign: (o: Object3D) => boolean = () => false): void {
    const from = parent.children.length;
    try {
      build();
    } finally {
      this.#roots.push(...parent.children.slice(from).filter((o) => !isForeign(o)));
    }
  }

  /** Whether `o` is a scene child this owner recorded. */
  owns(o: Object3D): boolean {
    return this.#roots.includes(o);
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
    if (!isDrawable(o)) return;
    const { geometry, material } = o;
    // an instanced mesh owns its instance matrix buffer on the GPU
    if (o instanceof InstancedMesh) this.#disposer.track(o);
    const materials = (Array.isArray(material) ? material : [material]).filter((m) => !shared.has(m));
    const resources: DisposableResource[] = [geometry, ...materials, ...materials.flatMap(texturesOf)];
    for (const r of resources) if (!shared.has(r)) this.#disposer.track(r);
  }
}
