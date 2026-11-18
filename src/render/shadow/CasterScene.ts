import { InstancedMesh, Scene, type BufferGeometry, type Camera, type Object3D } from 'three';
import { isShownUnder } from '../surface/collectScenery';
import { isMesh } from '../surface/trianglePoints';
import { BodyCasters } from './BodyCasters';
import { instancedChunks, meshChunks } from './casterChunks';
import { emptyParts } from './casterParts';
import { casts } from './casts';
import { createDepthMaterial } from './depthMaterials';
import { showInTile, tileVolume, VOLUME } from './tileCull';

const isInstanced = (node: Object3D): node is InstancedMesh<BufferGeometry> => node instanceof InstancedMesh;

/** Metres per grid cell: a spot's cone is a few metres wide where it meets scenery, so it crosses few cells. */
export const CELL = 4;
/** Metres per cell of the fixture bodies: about one fixture each, as a tile sees few of a row of 40 on a truss. */
export const BODY_CELL = 1;

/**
 * What blocks light on an imported stage, for the depth pass only: the meshes under `root` (scenery and proxies)
 * cut on a grid, so the frustum of one light culls most of it. The scenery itself is merged per material over the
 * whole stage and cannot be culled per light. It is built once per stage; `sync` follows the layer toggles.
 */
export class CasterScene {
  readonly scene = new Scene();
  /** Raised whenever the casters a light sees may have changed; never 0. */
  epoch = 1;
  readonly parts = emptyParts();
  /** Set per tile: 1 / range of the beam. */
  readonly invRange = { value: 1 };
  readonly #material = createDepthMaterial(this.invRange);
  /** The fixture bodies and figures. */
  readonly bodies: BodyCasters;
  readonly #root: Object3D;
  /** Each source mesh with the run of `parts.objects` made from it and whether that run is drawn. */
  readonly #sources: { node: Object3D; from: number; to: number; shown: boolean }[] = [];
  readonly #volume = new Float64Array(VOLUME);

  constructor(root: Object3D, cell = CELL, bodyCell = BODY_CELL) {
    this.#root = root;
    this.bodies = new BodyCasters(this.scene, this.#material, bodyCell);
    // the chunks carry world matrices already; without this every tile draw would walk all of them again
    this.scene.matrixWorldAutoUpdate = false;
    root.updateWorldMatrix(true, true);
    const { objects } = this.parts;
    root.traverse((node) => {
      if (!isMesh(node) || !casts(node.material)) return;
      const from = objects.length;
      if (isInstanced(node)) instancedChunks(node, this.#material, cell, this.parts);
      else meshChunks(node, this.#material, cell, this.parts);
      this.#sources.push({ node, from, to: objects.length, shown: true });
    });
    for (const object of objects) this.scene.add(object);
  }

  /** Sets the objects whose meshes cast as they stand now (see `BodyCasters`); call it again when they are rebuilt. */
  setBodies(roots: readonly Object3D[]): void {
    this.bodies.set(roots);
    this.epoch += 1;
  }

  /** Call once per frame: a mesh under a hidden layer or group stops casting, as it stops being drawn. */
  sync(): void {
    for (const source of this.#sources) {
      const shown = isShownUnder(source.node, this.#root);
      if (shown === source.shown) continue;
      source.shown = shown;
      for (let i = source.from; i < source.to; i++) {
        const object = this.parts.objects[i];
        if (object) object.visible = shown;
      }
      this.epoch += 1;
    }
  }

  /** Call before a tile is drawn: shows the chunks that the tile of `camera` can see. A hidden layer stays hidden. */
  cull(camera: Camera): void {
    tileVolume(camera, this.#volume);
    for (const { shown, from, to } of this.#sources) if (shown) showInTile(this.#volume, this.parts, from, to);
    showInTile(this.#volume, this.bodies.parts, 0, this.bodies.parts.objects.length);
  }

  /** Frees what this scene made. The scenery's own geometries and vertex buffers stay: the stage owns them. */
  dispose(): void {
    for (const geometry of this.parts.geometries) {
      // three.js frees the GPU buffer of every attribute a disposed geometry still has: the positions are shared
      geometry.deleteAttribute('position');
      geometry.dispose();
    }
    for (const mesh of this.parts.instanced) mesh.dispose();
    this.bodies.dispose();
    this.#material.dispose();
    this.scene.clear();
  }
}
