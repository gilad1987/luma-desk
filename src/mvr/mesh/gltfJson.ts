import { emptyBox, union, type Aabb, type Point3 } from '../math/Aabb';
import type { GltfNodeTransform } from './nodeMatrix';

/** A glTF node reduced to what bounds need, every field already checked. */
export interface GltfNode extends GltfNodeTransform {
  readonly mesh?: number | undefined;
  readonly children: readonly number[];
}

/** The glTF JSON reduced to what the import needs: the bounds' nodes and boxes, and the files it names. */
export interface GltfModel {
  readonly roots: readonly number[];
  readonly nodes: readonly GltfNode[];
  /** Local box per mesh index; empty when no primitive has a usable `POSITION` min/max. */
  readonly meshBoxes: readonly Aabb[];
  /** Each distinct `uri` of an image or buffer that is not a `data:` URI: the files the mesh needs from outside. */
  readonly externalUris: readonly string[];
}

type Json = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const record = (value: unknown): Json => (isRecord(value) ? value : {});
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const index = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
const indices = (value: unknown): number[] => list(value).flatMap((item) => index(item) ?? []);

/** `length` finite numbers, else `undefined`, so a string or a NaN in the file never reaches the matrix math. */
function numbers(value: unknown, length: number): number[] | undefined {
  const items = list(value);
  const finite = items.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
  return items.length === length && finite.length === length ? finite : undefined;
}

function point(value: unknown): Point3 | undefined {
  const [x, y, z] = numbers(value, 3) ?? [];
  return x === undefined || y === undefined || z === undefined ? undefined : [x, y, z];
}

/** The local box of one mesh: the union of its primitives' `POSITION` accessor `min`/`max`, which glTF requires. */
function meshBox(mesh: unknown, accessors: readonly unknown[]): Aabb {
  let box = emptyBox();
  for (const primitive of list(record(mesh)['primitives'])) {
    const position = index(record(record(primitive)['attributes'])['POSITION']);
    const accessor = record(position === undefined ? undefined : accessors[position]);
    const min = point(accessor['min']);
    const max = point(accessor['max']);
    if (min && max) box = union(box, { min, max });
  }
  return box;
}

function readNode(value: unknown): GltfNode {
  const node = record(value);
  return {
    mesh: index(node['mesh']),
    children: indices(node['children']),
    matrix: numbers(node['matrix'], 16),
    translation: numbers(node['translation'], 3),
    rotation: numbers(node['rotation'], 4),
    scale: numbers(node['scale'], 3),
  };
}

/** The image and buffer URIs that name another file; a `data:` URI holds its bytes inline. */
function externalUris(gltf: Json): string[] {
  const uris = [...list(gltf['images']), ...list(gltf['buffers'])].map((item) => record(item)['uri']);
  return [...new Set(uris.filter((uri): uri is string => typeof uri === 'string' && !/^data:/i.test(uri)))];
}

/** The default scene's nodes, or every node that no other node lists as a child. */
function rootNodes(gltf: Json, nodes: readonly GltfNode[]): number[] {
  const scene = record(list(gltf['scenes'])[index(gltf['scene']) ?? 0]);
  if (Array.isArray(scene['nodes'])) return indices(scene['nodes']);
  const children = new Set(nodes.flatMap((node) => node.children));
  return nodes.map((_node, at) => at).filter((at) => !children.has(at));
}

/**
 * Checks the parsed glTF JSON of a GLB file field by field. The file is untrusted input: a string where a number
 * belongs would otherwise turn into a NaN box, and a NaN spreads through the fit into every fixture position. Fields
 * that fail the check are dropped, as if the file had left them out.
 */
export function readGltf(json: unknown): GltfModel {
  const gltf = record(json);
  const nodes = list(gltf['nodes']).map(readNode);
  const accessors = list(gltf['accessors']);
  const meshBoxes = list(gltf['meshes']).map((mesh) => meshBox(mesh, accessors));
  return { roots: rootNodes(gltf, nodes), nodes, meshBoxes, externalUris: externalUris(gltf) };
}
