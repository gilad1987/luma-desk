import { loadMeshParts } from './loadMeshParts';
import type { MeshPart } from './MeshPart';

/**
 * The parsed meshes of one import, by archive file name. Each file is parsed once, however many placements share it,
 * and the library owns every geometry and material it made, so `dispose` frees them in one place. It does not own
 * the meshes built from the parts; `MvrStage` frees those.
 */
export class MeshLibrary {
  readonly #bytes: ReadonlyMap<string, Uint8Array>;
  readonly #loads = new Map<string, Promise<readonly MeshPart[]>>();
  readonly #loaded: MeshPart[] = [];
  #isDisposed = false;

  /** `bytes` is `MvrImport.meshes`: mesh bytes by archive file name. */
  constructor(bytes: ReadonlyMap<string, Uint8Array>) {
    this.#bytes = bytes;
  }

  /** The parts of `file`; none when the archive lacks it or it cannot be parsed, which the import already reported. */
  parts(file: string): Promise<readonly MeshPart[]> {
    let load = this.#loads.get(file);
    if (!load) {
      load = this.#load(file);
      this.#loads.set(file, load);
    }
    return load;
  }

  /** Frees every geometry and material parsed so far, and those of loads still running when they finish. */
  dispose(): void {
    this.#isDisposed = true;
    for (const part of this.#loaded.splice(0)) disposePart(part);
  }

  async #load(file: string): Promise<readonly MeshPart[]> {
    const bytes = this.#bytes.get(file);
    if (!bytes) return [];
    const parts = await loadMeshParts(file, bytes).catch((): MeshPart[] => []);
    if (this.#isDisposed) parts.forEach(disposePart);
    else this.#loaded.push(...parts);
    return parts;
  }
}

function disposePart({ geometry, material }: MeshPart): void {
  geometry.dispose();
  material.dispose();
}
