import { Group } from 'three';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { MvrGeometry } from '../../mvr/index';
import { buildLayers, type MvrProgress } from './buildLayers';
import { disposeOwnMeshes } from './disposeOwnMeshes';
import { drawAsLed, followLedLayers, freeLedMaterials } from './led/ledLayerLook';
import { syncWallLights } from './led/ledLightPool';
import { MeshLibrary, type MeshFailure } from './MeshLibrary';
import { MVR_LAYER_KEY } from './mvrLayerKey';

/**
 * What one imported stage draws from: its design, the import's scenery, the mesh bytes (`MvrImport.meshes`) and the
 * files those meshes name (`MvrImport.meshResources`).
 */
export interface MvrStageInput {
  readonly design: StageDesign;
  readonly geometry: MvrGeometry;
  readonly meshes: ReadonlyMap<string, Uint8Array>;
  readonly meshResources: ReadonlyMap<string, Uint8Array>;
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
  #led: ReadonlySet<string> = new Set();
  #build = 0;
  /** Ends the stage's part in the user's LED layer choice; set while the stage holds scenery. */
  #unfollow: (() => void) | undefined;

  /**
   * Replaces the scenery with that of `input`. The design's hidden layers start hidden. A later `show` or `dispose`
   * while this one still parses wins: the late result is freed and never shown. Resolves with the mesh files three.js
   * could not parse, which the import's bounds reader may have accepted, so the UI can name them in the summary.
   * The mesh bytes are freed only when the caller also drops `input.meshes` and `input.meshResources` (the import's).
   */
  async show(input: MvrStageInput, onProgress?: MvrProgress): Promise<readonly MeshFailure[]> {
    this.dispose();
    this.#unfollow = followLedLayers((uuids) => this.setLedLayers(uuids));
    const build = this.#build;
    const library = new MeshLibrary(input.meshes, input.meshResources);
    this.#library = library;
    this.#hidden = new Set(input.design.mvr?.hiddenLayers ?? []);
    this.#led = new Set(input.design.mvr?.ledLayers ?? []);
    const layers = await buildLayers(input.geometry, library, onProgress);
    if (build !== this.#build) {
      layers.forEach(disposeOwnMeshes);
      return library.failures();
    }
    this.#layers = layers;
    layers.forEach((layer, uuid) => (layer.userData[MVR_LAYER_KEY] = uuid)); // the test hook's scenery boxes read it
    if (layers.size > 0) this.group.add(...layers.values());
    this.setHiddenLayers([...this.#hidden]);
    this.setLedLayers([...this.#led]);
    return library.failures();
  }

  /** Hides the layers with these uuids and shows every other one, as the layer list in the UI says. */
  setHiddenLayers(uuids: readonly string[]): void {
    this.#hidden = new Set(uuids);
    for (const [uuid, layer] of this.#layers) layer.visible = !this.#hidden.has(uuid);
  }

  /** Draws the file meshes of the layers with these uuids as LED walls, and every other layer as the file gives it. */
  setLedLayers(uuids: readonly string[]): void {
    this.#led = new Set(uuids);
    const panel = this.#library?.screens.panel;
    if (!panel) return;
    for (const [uuid, layer] of this.#layers) drawAsLed(layer, panel, this.#led.has(uuid));
    // The wall lights start here, with the layers in place: after this their own frame mesh keeps them in step.
    syncWallLights();
  }

  /** Removes and frees all scenery and cancels a build still running; the group stays usable for a later `show`. */
  dispose(): void {
    this.#build += 1;
    this.#unfollow?.();
    this.#unfollow = undefined;
    this.group.clear();
    // the LED materials and wall lights made per mesh are not the library's, so they are freed here
    this.#layers.forEach(freeLedMaterials);
    this.#layers.forEach(disposeOwnMeshes);
    this.#layers = new Map();
    this.#library?.dispose();
    this.#library = undefined;
  }
}
