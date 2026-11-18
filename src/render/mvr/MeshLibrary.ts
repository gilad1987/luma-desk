import type { BufferGeometry } from 'three';
import { loadMeshParts } from './loadMeshParts';
import { MaterialPool } from './MaterialPool';
import type { MeshPart } from './MeshPart';

/** A mesh file the archive holds but three.js could not parse, with the loader's reason, for the import summary. */
export interface MeshFailure {
  readonly file: string;
  readonly reason: string;
}

/**
 * The parsed meshes of one import, by archive file name. Each file is parsed once, however many placements share it,
 * and the library owns every geometry, material and texture it made, so `dispose` frees them in one place. Materials
 * that look alike are pooled across files. It does not own the meshes built from the parts; `MvrStage` frees those.
 */
export class MeshLibrary {
  readonly #bytes: Map<string, Uint8Array>;
  readonly #resources: ReadonlyMap<string, Uint8Array>;
  readonly #loads = new Map<string, Promise<readonly MeshPart[]>>();
  readonly #geometries: BufferGeometry[] = [];
  readonly #materials = new MaterialPool();
  readonly #failures: MeshFailure[] = [];
  #isDisposed = false;

  /**
   * `bytes` is `MvrImport.meshes`: mesh bytes by archive file name. The library lets go of each file once read.
   * `resources` is `MvrImport.meshResources`: the files the meshes name, kept as long as the library, since meshes
   * share them.
   */
  constructor(bytes: ReadonlyMap<string, Uint8Array>, resources: ReadonlyMap<string, Uint8Array> = new Map()) {
    this.#bytes = new Map(bytes);
    this.#resources = resources;
  }

  /** The parts of `file`; none when the archive lacks it (the import warned) or it cannot be parsed (see `failures`). */
  parts(file: string): Promise<readonly MeshPart[]> {
    let load = this.#loads.get(file);
    if (!load) {
      load = this.#load(file);
      this.#loads.set(file, load);
    }
    return load;
  }

  /** The files the archive holds but three.js could not parse so far: the import's bounds reader is more lenient. */
  failures(): readonly MeshFailure[] {
    return [...this.#failures];
  }

  /** Frees every geometry, material and texture parsed so far, and those of loads still running when they finish. */
  dispose(): void {
    this.#isDisposed = true;
    for (const geometry of this.#geometries.splice(0)) geometry.dispose();
    this.#materials.dispose();
  }

  async #load(file: string): Promise<readonly MeshPart[]> {
    const bytes = this.#bytes.get(file);
    this.#bytes.delete(file);
    if (!bytes) return [];
    const parsed = await this.#parse(file, bytes);
    const parts = parsed.map(({ geometry, material }) => ({ geometry, material: this.#materials.adopt(material) }));
    this.#geometries.push(...parts.map((part) => part.geometry));
    if (this.#isDisposed) this.dispose();
    return parts;
  }

  async #parse(file: string, bytes: Uint8Array): Promise<MeshPart[]> {
    try {
      return await loadMeshParts(file, bytes, this.#resources);
    } catch (error) {
      this.#failures.push({ file, reason: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }
}
