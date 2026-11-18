import { emptyBox, isEmpty, isFiniteBox, transformBox, union, type Aabb } from '../math/Aabb';
import { identity, multiply, type Mat4 } from '../math/Mat4';
import { attr, childElement, childElements } from '../xml/elements';
import type { GdtfTreeSize } from './GdtfInfo';

/** Deeper than any real fixture nests its parts; it stops a `GeometryReference` loop in a broken file. */
const MAX_DEPTH = 12;

/** What a geometry tree is measured with: model sizes by name and the top-level geometries a reference can name. */
interface Parts {
  readonly models: ReadonlyMap<string, readonly [number, number, number]>;
  readonly tops: ReadonlyMap<string, Element>;
}

/** A model dimension in metres; missing, negative or not a number reads as the GDTF default 0. */
function dimension(model: Element, name: string): number {
  const value = Number(attr(model, name)?.trim() || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * A GDTF `Matrix`: 4 x 4 numbers, one row per brace group, the translation in the 4th column, in metres. A missing
 * or malformed one reads as the identity, the GDTF default.
 */
function readPosition(text: string | undefined): Mat4 {
  const numbers = (text?.match(/[^{},\s]+/g) ?? []).map(Number);
  const m = identity();
  if (numbers.length !== 16 || !numbers.every(Number.isFinite)) return m;
  // `Mat4` holds columns, the text holds rows
  numbers.forEach((value, index) => (m[(index % 4) * 4 + Math.floor(index / 4)] = value));
  return m;
}

/**
 * The box of `node` and the geometries under it, in the frame of the tree's top geometry. A `GeometryReference`
 * stands for the top-level geometry it names: it gives the position, and the model unless it names its own.
 */
function boxOf(node: Element, parent: Mat4, parts: Parts, depth: number): Aabb {
  const isReference = node.localName === 'GeometryReference';
  const target = isReference ? parts.tops.get(attr(node, 'Geometry') ?? '') : node;
  const world = multiply(parent, readPosition(attr(node, 'Position')));
  const [x, y, z] = parts.models.get(attr(node, 'Model') ?? (target && attr(target, 'Model')) ?? '') ?? [0, 0, 0];
  // the top part hangs from the device origin, the centre of its base plate; every other part is drawn around its own
  const own: Aabb = { min: [-x / 2, -y / 2, depth === 0 ? -z : -z / 2], max: [x / 2, y / 2, depth === 0 ? 0 : z / 2] };
  let box = x + y + z > 0 ? transformBox(own, world) : emptyBox();
  if (target === undefined || depth >= MAX_DEPTH) return box;
  for (const child of childElements(target)) box = union(box, boxOf(child, world, parts, depth + 1));
  return box;
}

/**
 * The overall size of each top-level geometry tree, from the `Model` dimensions and the geometry `Position` matrices
 * of `description.xml`. GDTF: Length, Width and Height are metres on X, Y and Z, the mesh is scaled to them, and the
 * device hangs with Z up and its origin at the centre of the base plate. The file does not say where a mesh sits in
 * its box, so this takes the top part as hanging below the origin and every deeper part as centred on its own (GDTF:
 * a part is drawn around its suspension point and centred on its axis of rotation). The result can be wrong by half
 * the size of an outermost part. A tree without a sized model gives no entry. `GeometryReference` models and their
 * children are counted; mesh files are not opened.
 */
export function readSizes(fixtureType: Element): GdtfTreeSize[] {
  const modelList = childElement(fixtureType, 'Models');
  const geometries = childElement(fixtureType, 'Geometries');
  const tops = geometries ? childElements(geometries) : [];
  const size = (model: Element): [number, number, number] => [
    dimension(model, 'Length'),
    dimension(model, 'Width'),
    dimension(model, 'Height'),
  ];
  const parts: Parts = {
    models: new Map(
      (modelList ? childElements(modelList, 'Model') : []).map((el) => [attr(el, 'Name') ?? '', size(el)]),
    ),
    tops: new Map(tops.map((top) => [attr(top, 'Name') ?? '', top])),
  };
  return tops.flatMap((root) => {
    const box = boxOf(root, identity(), parts, 0);
    if (isEmpty(box) || !isFiniteBox(box)) return [];
    const { min, max } = box;
    // a hanging device lies below its origin: where most of the tree does, a centred box that reaches above is cut
    const top = -min[2] >= max[2] ? Math.min(max[2], 0) : max[2];
    return [{ geometry: attr(root, 'Name') ?? '', size: [max[0] - min[0], max[1] - min[1], top - min[2]] }];
  });
}
