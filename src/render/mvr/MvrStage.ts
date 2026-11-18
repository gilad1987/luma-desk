import { Group, InstancedMesh, type Object3D } from 'three';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { MvrGeometry } from '../../mvr/index';
import { buildLayers, type MvrProgress } from './buildLayers';
import { isMesh } from './isMesh';
import { MeshLibrary, type MeshFailure } from './MeshLibrary';

/** What one imported stage draws from: its design, the import's scenery and the mesh bytes (`MvrImport.meshes`). */
export interface MvrStageInput {
  readonly design: StageDesign;
  readonly geometry: MvrGeometry;
  readonly meshes: ReadonlyMap<string, Uint8Array>;
}

/**
 * The MVR scenery of an imported stage as one three.js group with a child group per MVR layer. It builds, rebuilds
 * and frees the meshes; it does not subscribe to stage events, add itself to a scene, fit the camera or set beam
 * surfaces: the render wiring calls `show`, `setHiddenLayers` and `dispose` and owns those steps.
 */
export class MvrStage {
  /** Add this once to the scene; `show` replaces its children. */
  readonly group = new Group();
  #library: MeshLibrary | undefined;
  #layers = new Map<string, Group>();
  #hidden: ReadonlySet<string> = new Set();
  #build = 0;

  /**
   * Replaces the scenery with that of `input`. The design's hidden layers start hidden. A later `show` or `dispose`
   * while this one still parses wins: the late result is freed and never shown. Resolves with the mesh files three.js
   * could not parse, which the import's bounds reader may have accepted, so the UI can name them in the summary.
   * The mesh bytes are freed only when the caller also drops `input.meshes` (the import's `result.meshes`).
   */
  async show(input: MvrStageInput, onProgress?: MvrProgress): Promise<readonly MeshFailure[]> {
    this.dispose();
    const build = this.#build;
    const library = new MeshLibrary(input.meshes);
    this.#library = library;
    this.#hidden = new Set(input.design.mvr?.hiddenLayers ?? []);
    const layers = await buildLayers(input.geometry, library, onProgress);
    if (build !== this.#build) {
      layers.forEach(disposeOwnMeshes);
      return library.failures();
    }
    this.#layers = layers;
    if (layers.size > 0) this.group.add(...layers.values());
    this.setHiddenLayers([...this.#hidden]);
    return library.failures();
  }

  /** Hides the layers with these uuids and shows every other one, as the layer list in the UI says. */
  setHiddenLayers(uuids: readonly string[]): void {
    this.#hidden = new Set(uuids);
    for (const [uuid, layer] of this.#layers) layer.visible = !this.#hidden.has(uuid);
  }

  /** Removes and frees all scenery and cancels a build still running; the group stays usable for a later `show`. */
  dispose(): void {
    this.#build += 1;
    this.group.clear();
    this.#layers.forEach(disposeOwnMeshes);
    this.#layers = new Map();
    this.#library?.dispose();
    this.#library = undefined;
  }
}

/**
 * Frees what the stage's meshes own: an instanced mesh its instance buffers, a merged mesh its merged geometry.
 * Shared geometries and all materials belong to the library.
 */
function disposeOwnMeshes(layer: Object3D): void {
  layer.traverse((node) => {
    if (node instanceof InstancedMesh) node.dispose();
    else if (isMesh(node)) node.geometry.dispose();
  });
}
