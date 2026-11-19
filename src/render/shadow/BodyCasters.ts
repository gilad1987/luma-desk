import { InstancedMesh, Matrix4, type BufferGeometry, type Material, type Object3D, type Scene } from 'three';
import { isMesh } from '../surface/trianglePoints';
import { instancedChunks } from './casterChunks';
import { emptyParts } from './casterParts';
import { casts } from './casts';

function instanceWorld(mesh: Pick<InstancedMesh, 'getMatrixAt' | 'matrixWorld'>, i: number): Matrix4 {
  const matrix = new Matrix4();
  mesh.getMatrixAt(i, matrix);
  return matrix.premultiply(mesh.matrixWorld);
}

/** The solid meshes under `root` that are drawn now, with world matrices of this moment, into `out`. */
function collectBody(root: Object3D, out: Map<BufferGeometry, Matrix4[]>): void {
  for (let at = root.parent; at; at = at.parent) if (!at.visible) return;
  root.updateWorldMatrix(true, true);
  root.traverseVisible((node) => {
    if (!isMesh(node) || !casts(node.material)) return;
    const placed = out.get(node.geometry) ?? [];
    out.set(node.geometry, placed);
    if (!(node instanceof InstancedMesh)) placed.push(node.matrixWorld.clone());
    // an instanced source (a crowd) gives one placement per instance
    else for (let i = 0; i < node.count; i++) placed.push(instanceWorld(node, i));
  });
}

/**
 * Objects that are not scenery, as casters: the body meshes of the fixtures (a figure or a crowd works the same way). Fixtures
 * of one type share their geometries, so the casters are instanced per geometry and grid cell, on those geometries:
 * no vertex is copied. A box per body was measured first and is wrong for this: the box of a turned part is larger
 * than the part, and in a dense rig the boxes of the neighbours blocked whole beams.
 *
 * The meshes stand as they were when `set` was called: a head that pans keeps the pose of that moment. Casters that
 * followed the heads would change the scenery epoch in every frame of a move, and every tile would be drawn again.
 * A light is clear of its own body: the tile frustum starts past it (`NEAR_CLEAR` in `tileFrustum.ts`).
 */
export class BodyCasters {
  readonly parts = emptyParts();
  readonly #scene: Scene;
  readonly #material: Material;
  readonly #cell: number;

  constructor(scene: Scene, material: Material, cell: number) {
    this.#scene = scene;
    this.#material = material;
    this.#cell = cell;
  }

  /** Replaces the casters with the meshes of `roots`, as they stand now; a hidden root gives none. */
  set(roots: readonly Object3D[]): void {
    this.dispose();
    const bodies = new Map<BufferGeometry, Matrix4[]>();
    for (const root of roots) collectBody(root, bodies);
    for (const [geometry, matrices] of bodies) {
      // `all` only carries the placements to the grid: the chunks hold their own matrices
      const all = new InstancedMesh(geometry, this.#material, matrices.length);
      matrices.forEach((matrix, i) => all.setMatrixAt(i, matrix));
      instancedChunks(all, this.#material, this.#cell, this.parts);
      all.dispose();
    }
    for (const object of this.parts.objects) this.#scene.add(object);
  }

  /** Frees the casters. The geometries stay: the fixtures own them. */
  dispose(): void {
    for (const mesh of this.parts.instanced) {
      this.#scene.remove(mesh);
      mesh.dispose();
    }
    this.parts.objects.length = 0;
    this.parts.boxes.length = 0;
    this.parts.counts.length = 0;
    this.parts.instanced.length = 0;
    this.parts.triangles = 0;
    this.parts.bytes = 0;
  }
}
