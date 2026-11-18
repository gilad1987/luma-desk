import type { BufferGeometry, Material } from 'three';
import { loadMeshParts } from './loadMeshParts';
import { MaterialPool } from './MaterialPool';
import type { MeshPart } from './MeshPart';
import { MvrScreenMaterials } from './mvrScreenMaterial';
import { OfflineLoadingManager } from './OfflineLoadingManager';
import { styleScenery } from './sceneryStyle';

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
  readonly #manager: OfflineLoadingManager;
  readonly #loads = new Map<string, Promise<readonly MeshPart[]>>();
  readonly #geometries: BufferGeometry[] = [];
  readonly #materials = new MaterialPool();
  /** The materials the screen placements of the import draw with (`isScreenPlacement`); freed by `dispose`. */
  readonly screens = new MvrScreenMaterials();
  readonly #failures: MeshFailure[] = [];
  #parsing = 0;
  #isDisposed = false;

  /**
   * `bytes` is `MvrImport.meshes`: mesh bytes by archive file name. `resources` is `MvrImport.meshResources`: the
   * files the meshes name, shared by all parses through one loading manager, so an image is decoded once. The library
   * lets go of each mesh file once read, and of the resources once every mesh file is parsed.
   */
  constructor(bytes: ReadonlyMap<string, Uint8Array>, resources: ReadonlyMap<string, Uint8Array>) {
    this.#bytes = new Map(bytes);
    this.#manager = new OfflineLoadingManager(resources);
  }

  /** The parts of `file`; none when the archive lacks it (the import warned) or it cannot parse (see `failures`). */
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

  /**
   * Frees every geometry, material and texture parsed so far, and those of loads still running when they finish.
   * It also lets go of the mesh bytes not yet read, and releases the archive resources and their blob URLs; while a
   * parse still runs, that release waits until the last parse ends, so no running parse loses its files.
   */
  dispose(): void {
    this.#isDisposed = true;
    this.#bytes.clear();
    this.#releaseIfIdle();
    for (const geometry of this.#geometries.splice(0)) geometry.dispose();
    this.#materials.dispose();
    this.screens.dispose();
  }

  async #load(file: string): Promise<readonly MeshPart[]> {
    const bytes = this.#bytes.get(file);
    this.#bytes.delete(file);
    if (!bytes) return [];
    const parsed = await this.#parse(file, bytes);
    const adopt = (material: Material): Material => this.#materials.adopt(styleScenery(material));
    const parts = parsed.map(({ geometry, material }) => ({ geometry, material: adopt(material) }));
    this.#geometries.push(...parts.map((part) => part.geometry));
    if (this.#isDisposed) this.dispose();
    return parts;
  }

  async #parse(file: string, bytes: Uint8Array): Promise<MeshPart[]> {
    this.#parsing += 1;
    try {
      return await loadMeshParts(file, bytes, this.#manager);
    } catch (error) {
      this.#failures.push({ file, reason: error instanceof Error ? error.message : String(error) });
      return [];
    } finally {
      this.#parsing -= 1;
      this.#releaseIfIdle();
    }
  }

  /** Releases the resources and their blob URLs once no parse runs and no mesh file is left to parse. */
  #releaseIfIdle(): void {
    if (this.#parsing === 0 && this.#bytes.size === 0) this.#manager.dispose();
  }
}
