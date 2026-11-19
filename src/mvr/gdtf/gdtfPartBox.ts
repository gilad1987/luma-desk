import { emptyBox, pointBox, transformBox, union, type Aabb, type Point3 } from '../math/Aabb';
import { transformPoint, type Mat4 } from '../math/Mat4';
import type { GdtfModel, GdtfNode } from './GdtfBody';
import { primitiveShape } from './primitiveShapes';

/** One model file in metres, in the mesh's own frame on GDTF axes: its box and, when read, x, y, z of every vertex. */
export interface MeshShape {
  readonly box: Aabb;
  readonly points?: Float64Array;
}

/** The shape of a model's mesh file; undefined without a readable mesh. */
export type MeshBoxOf = (model: GdtfModel) => MeshShape | undefined;

/** The default meshes whose origin is the mounting plate (GDTF 1.1: Base, Conventional, Scanner): they hang below it. */
const HANGS = /^(Base|Conventional|Scanner)1_1$/;

/** The factor per axis that scales `mesh` to the model size; an axis without a size takes the mean (`fitMatrix`). */
function fitFactors(mesh: Aabb, size: readonly number[]): Point3 {
  const factors = size.map((wanted, axis) => {
    const have = (mesh.max[axis] ?? 0) - (mesh.min[axis] ?? 0);
    return wanted > 0 && have > 1e-9 ? wanted / have : 0;
  });
  const set = factors.filter((factor) => factor > 0);
  const rest = set.length > 0 ? set.reduce((sum, factor) => sum + factor, 0) / set.length : 1;
  const [x = 1, y = 1, z = 1] = factors.map((factor) => factor || rest);
  return [x, y, z];
}

/**
 * One part's own shape in the part frame. `centred` marks a box whose place on Z is an assumption (see `partBox`);
 * `points` are the mesh vertices before `scale`, which brings them to the model size about the mesh origin.
 */
export interface PartBox {
  readonly box: Aabb;
  readonly centred: boolean;
  readonly points?: Float64Array;
  readonly scale?: Point3;
}

/**
 * The box of the part's own model in the part frame; none for a pigtail, a wiring object or a model that has neither
 * a readable mesh nor a size (a mesh without a size is taken at the size of the file).
 *
 * - A part with a readable mesh: the mesh scaled to the model size about the mesh origin, which is where the drawn
 *   mesh is (GDTF: "the mesh is explicitly scaled to this dimension").
 * - A part without a mesh file that names a primitive with a default shape (`primitiveShape`): the bounds of that
 *   shape, scaled the same way. It is what the draw step draws, so its place is a fact, not an assumption.
 * - Any other root part without a mesh hangs below its origin. GDTF: "0,0,0 - center base plate" and "the offsets are
 *   mostly negative, because the device is displayed in a hanging position": the origin is the top of the root part.
 *   A 1.1 primitive whose file cannot be read hangs at any depth (`HANGS`): its origin is the mounting plate.
 * - Any other deeper part without a mesh: GDTF says "The mesh of each fixture part shall be drawn around its own
 *   suspension point" and "it must be centered on its axis of rotation", which centres the box on the axis.
 *   ASSUMPTION: the box is centred on Z too; the spec does not say where the mesh sits along the axis.
 */
export function partBox(node: GdtfNode, isRoot: boolean, meshBox: MeshBoxOf | undefined): PartBox | undefined {
  const { model } = node;
  if (!model || node.tag === 'WiringObject' || model.primitiveType === 'Pigtail') return undefined;
  const mesh: MeshShape | undefined = meshBox?.(model) ?? primitiveShape(model);
  if (mesh) {
    const scale = fitFactors(mesh.box, model.size);
    const fit = ([x, y, z]: Point3): Point3 => [x * scale[0], y * scale[1], z * scale[2]];
    const points = mesh.points ? { points: mesh.points, scale } : {};
    return { box: { min: fit(mesh.box.min), max: fit(mesh.box.max) }, centred: false, ...points };
  }
  const [x, y, z] = model.size;
  if (x + y + z <= 0) return undefined;
  const centred = !isRoot && !HANGS.test(model.primitiveType);
  const top = centred ? z / 2 : 0;
  return { box: { min: [-x / 2, -y / 2, top - z], max: [x / 2, y / 2, top] }, centred };
}

/**
 * The box of a part moved by `world`. With mesh vertices it is the box of the moved vertices, so a round part turned
 * about its own axis keeps its size; the box of a turned box would add up to 41 % on two axes. Without vertices (a
 * part without a mesh, a glTF file whose vertex data is not read) the 8 corners of the part's box are moved.
 */
export function placedBox(part: PartBox, world: Mat4): Aabb {
  const { points, scale: [sx, sy, sz] = [1, 1, 1] } = part;
  if (!points || points.length < 3) return transformBox(part.box, world);
  let box = emptyBox();
  for (let i = 0; i + 2 < points.length; i += 3) {
    const vertex: Point3 = [(points[i] ?? 0) * sx, (points[i + 1] ?? 0) * sy, (points[i + 2] ?? 0) * sz];
    box = union(box, pointBox(transformPoint(world, vertex)));
  }
  return box;
}
