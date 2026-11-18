import type { Material, ShaderMaterial } from 'three';
import { createSurfaceMaterial } from './surfaceMaterial';

/**
 * One surface-buffer material per scene material, made on first use. All of them share one program. An entry goes
 * when its scene material is disposed, so a stage that is replaced while the buffers live leaves nothing behind.
 */
export class SurfaceMaterials {
  readonly #made = new Map<Material, ShaderMaterial>();

  /** The number of scene materials that have a surface material now. */
  get size(): number {
    return this.#made.size;
  }

  /** The surface material of a scene material. A property, so the scene swap calls it with no closure per frame. */
  readonly of = (source: Material): ShaderMaterial => {
    let made = this.#made.get(source);
    if (!made) {
      made = createSurfaceMaterial(source);
      this.#made.set(source, made);
      source.addEventListener('dispose', this.#drop);
    }
    return made;
  };

  readonly #drop = ({ target }: { target: Material }): void => {
    target.removeEventListener('dispose', this.#drop);
    this.#made.get(target)?.dispose();
    this.#made.delete(target);
  };

  /** Frees every surface material and stops listening to the scene materials. */
  dispose(): void {
    for (const [source, made] of this.#made) {
      source.removeEventListener('dispose', this.#drop);
      made.dispose();
    }
    this.#made.clear();
  }
}
