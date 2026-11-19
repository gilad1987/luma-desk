import type { Box3, BufferGeometry, InstancedMesh, Object3D } from 'three';

/** The depth-only objects of a caster scene and what they cost. */
export interface CasterParts {
  readonly objects: Object3D[];
  /** The world box of each object, six numbers per entry of `objects`: min x, y, z, max x, y, z. */
  readonly boxes: number[];
  /** The triangles each object draws; a triangle that is in two cells counts in both. */
  readonly counts: number[];
  /** The chunk geometries this scene made; a geometry shared whole with the scenery is not in it. */
  readonly geometries: BufferGeometry[];
  readonly instanced: InstancedMesh[];
  /** The triangles of the sources, each counted once. */
  triangles: number;
  /** Bytes of new buffers: the sorted indices and the instance matrices. No vertex is copied. */
  bytes: number;
}

export function emptyParts(): CasterParts {
  return { objects: [], boxes: [], counts: [], geometries: [], instanced: [], triangles: 0, bytes: 0 };
}

/** Puts a chunk where its source stands in the world; the caster scene never updates matrices. */
export function placed<T extends Object3D>(chunk: T, source: Object3D): T {
  chunk.matrixAutoUpdate = false;
  chunk.matrix.copy(source.matrixWorld);
  chunk.matrixWorld.copy(source.matrixWorld);
  return chunk;
}

/**
 * Adds a chunk with its world box. three.js culls by a bounding sphere, and the sphere around a flat or thin cell
 * is far larger than the cell: one hero tile drew 40 % of all casters that way. So the chunk opts out, and
 * `CasterScene.cull` shows it per tile by `box`.
 */
export function addChunk(out: CasterParts, chunk: Object3D, box: Box3, triangles: number): void {
  chunk.frustumCulled = false;
  out.objects.push(chunk);
  out.boxes.push(box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z);
  out.counts.push(triangles);
}
