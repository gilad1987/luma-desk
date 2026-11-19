import type { Aabb } from '../math/Aabb';
import { glbBounds } from '../mesh/glbBounds';
import { meshFormatOf } from '../mesh/meshFormatOf';
import { tdsBounds } from '../mesh/tdsBounds';
import type { GdtfBody, GdtfModel } from './GdtfBody';
import { treeSize, type MeshShape } from './gdtfTreeSize';

/** Metres per 3DS unit: a 3DS mesh is in millimetres, and the render bakes the same factor into it (`loadMeshParts`). */
const TDS_METRES = 0.001;

/** The 3DS box and vertices in metres. */
function tdsShape(bytes: Uint8Array): MeshShape | undefined {
  const raw: number[] = [];
  const box = tdsBounds(bytes, raw);
  const metres = ([x, y, z]: Aabb['min']): Aabb['min'] => [x * TDS_METRES, y * TDS_METRES, z * TDS_METRES];
  const points = Float64Array.from(raw, (value) => value * TDS_METRES);
  return box && { box: { min: metres(box.min), max: metres(box.max) }, points };
}

/**
 * The shape of one GDTF model file in metres, in the mesh's own frame on GDTF axes (Z up). A 3DS file is Z up already
 * and in millimetres; a glTF file is in metres and Y up, so its Y is the GDTF Z and its Z the GDTF -Y. The unit
 * matters for a model without Length, Width and Height: nothing scales its mesh, so it is drawn at the file's size.
 * Known limit: a glTF file gives its box only (the accessor bounds of the JSON chunk), not its vertices.
 */
export function gdtfMeshShape(path: string, bytes: Uint8Array): MeshShape | undefined {
  if (meshFormatOf(path) === '3ds') return tdsShape(bytes);
  const box = meshFormatOf(path) === 'glb' ? glbBounds(bytes) : undefined;
  return box && { box: { min: [box.min[0], -box.max[2], box.min[1]], max: [box.max[0], -box.min[2], box.max[1]] } };
}

/** The box of one GDTF model file (`gdtfMeshShape`). */
export function gdtfMeshBox(path: string, bytes: Uint8Array): Aabb | undefined {
  return gdtfMeshShape(path, bytes)?.box;
}

type Size = readonly [number, number, number];

/** What one import has measured: each model file once, and each body once, however many fixtures use them. */
export interface MeshCache {
  readonly shapes: Map<Uint8Array, MeshShape | undefined>;
  readonly sizes: Map<GdtfBody, Size | undefined>;
  /** The model files that did not parse (a damaged GLB JSON chunk), so the import can warn about each one. */
  readonly bad: Set<Uint8Array>;
}

export const meshCache = (): MeshCache => ({ shapes: new Map(), sizes: new Map(), bad: new Set() });

/** The shape of a model file, or none when it does not parse: one damaged model must not fail the whole import. */
function safeShape(path: string, bytes: Uint8Array, cache: MeshCache): MeshShape | undefined {
  try {
    return gdtfMeshShape(path, bytes);
  } catch {
    cache.bad.add(bytes);
    return undefined;
  }
}

/**
 * The overall size of a body measured on its real meshes (`treeSize`); `meshOf` gives the bytes of a model file by
 * its path in the GDTF. A body belongs to one GDTF file, so its size is measured once per `cache`: turning every
 * vertex of every part again for each of hundreds of fixtures would cost seconds.
 */
export function meshTreeSize(
  body: GdtfBody,
  meshOf: (path: string) => Uint8Array | undefined,
  cache: MeshCache,
): Size | undefined {
  if (cache.sizes.has(body)) return cache.sizes.get(body);
  const shapeOf = ({ path }: GdtfModel): MeshShape | undefined => {
    const bytes = path === undefined ? undefined : meshOf(path);
    if (!bytes || path === undefined) return undefined;
    if (!cache.shapes.has(bytes)) cache.shapes.set(bytes, safeShape(path, bytes, cache));
    return cache.shapes.get(bytes);
  };
  const size = body.root ? treeSize(body.root, shapeOf) : undefined;
  cache.sizes.set(body, size);
  return size;
}
