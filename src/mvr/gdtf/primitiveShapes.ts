import type { Aabb, Point3 } from '../math/Aabb';
import type { GdtfModel } from './GdtfBody';

/**
 * The shape GDTF draws for a `Model` that names a `PrimitiveType` and has no mesh file of its own. GDTF (DIN SPEC
 * 15800), Model attributes: `PrimitiveType`, "Type of 3D model; The currently defined values are: 'Undefined', 'Cube',
 * 'Cylinder', 'Sphere', 'Base', 'Yoke', 'Head', 'Scanner', 'Conventional', 'Pigtail', 'Base1_1', 'Scanner1_1',
 * 'Conventional1_1'; Default value: 'Undefined'".
 *
 * - `mesh`: a default mesh of the specification (`docs/gdtf-default-meshes.md`). The repository publishes one for
 *   Base, Yoke, Head, Scanner and Conventional, and a second one for Base1_1, Scanner1_1 and Conventional1_1.
 * - `solid`: Cube, Cylinder and Sphere have no file; they are the plain solids of their names.
 * - Undefined and Pigtail have no shape. A pigtail marks where the cable leaves (GDTF 0.87: "Pigtail position should
 *   not be specified in 2D or 3D files anymore. Instead of it should be created a general geometry and linked to a
 *   model with primitive type 'Pigtail'"), so it is not a part of the housing.
 *
 * `box` is the bounds of the shape in its own unit, about its own origin, on GDTF X, Y and Z (Z up). GDTF: "The
 * dimension XML attributes of model are always used, no matter the scaling and ratio of the mesh file. The mesh is
 * explicitly scaled to this dimension. The length defines the dimension of the model on the X axis, the width on the Y
 * axis and the height on the Z axis". So the unit of a mesh does not matter (the default meshes are about one unit
 * large, and the GDTF text gives no unit for a mesh file), and `box` scaled to the model size is the box the drawn
 * part fills: only its place about the origin is information.
 */
export interface PrimitiveShape {
  readonly mesh?: string;
  readonly solid?: 'cube' | 'cylinder' | 'sphere';
  readonly box: Aabb;
}

/**
 * GDTF: "The mesh of each fixture part shall be drawn around its own suspension point". ASSUMPTION: a plain solid is
 * centred on its origin, as the five first default meshes are, and a cylinder stands on the Z axis (the height); the
 * text places neither.
 */
const CENTRED: Aabb = { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] };

const mesh = (name: string, min: Point3, max: Point3): PrimitiveShape => ({
  mesh: `primitivetype_${name}.3ds`,
  box: { min, max },
});

/**
 * The bounds are measured on the published files (`primitiveShapes.files.test.ts` holds them to the files). The first
 * five meshes are centred on their origin on Z: a `Base` rises half its height above its origin and a `Yoke` is not
 * hung below its bearing. GDTF 1.1: "The default meshes for Base, Conventional and Scanner were updated. The origin of
 * the meshes is now the mounting plate", so those three hang below their origin (Z from -height to 0). The scanners
 * and the first conventional are not centred on Y: the mirror arm and the bracket reach to one side.
 */
const SHAPES: ReadonlyMap<string, PrimitiveShape> = new Map([
  ['Cube', { solid: 'cube', box: CENTRED }],
  ['Cylinder', { solid: 'cylinder', box: CENTRED }],
  ['Sphere', { solid: 'sphere', box: CENTRED }],
  ['Base', mesh('base', [-0.54491, -0.50236, -0.49822], [0.54456, 0.50295, 0.49696])],
  ['Yoke', mesh('yoke', [-0.499, -0.50031, -0.50057], [0.501, 0.49969, 0.49943])],
  ['Head', mesh('head', [-0.49808, -0.50171, -0.49715], [0.49832, 0.50215, 0.49484])],
  ['Scanner', mesh('scanner', [-0.5, -0.70614, -0.49558], [0.5, 0.29386, 0.50442])],
  ['Conventional', mesh('conventional', [-0.5, -1.07289, -0.50199], [0.5, 0.53344, 0.52584])],
  ['Base1_1', mesh('base_1.1', [-0.54491, -0.50236, -0.99563], [0.54456, 0.50295, -0.00045])],
  ['Scanner1_1', mesh('scanner_1.1', [-0.21516, -0.73413, -0.43382], [0.21516, 0.36587, -0.00019])],
  ['Conventional1_1', mesh('conventional_1.1', [-0.5, -0.50118, -1.6803], [0.5, 0.49882, -0.00053])],
]);

/** Every primitive type that has a shape, for the tests that hold the table to the published files. */
export const PRIMITIVE_SHAPES: ReadonlyMap<string, PrimitiveShape> = SHAPES;

/**
 * The default shape that draws `model`; undefined when the model has a mesh file in the archive, names no primitive
 * with a shape, or has no size. GDTF calls `File` "Optional" and the "description of the model", and does not rank it
 * against `PrimitiveType`: a file the archive holds is the maker's own model, so it is drawn and the primitive is not.
 * A shape needs one dimension at least; an axis without one takes the mean factor of the others (`fitMatrix`).
 */
export function primitiveShape(model: GdtfModel | undefined): PrimitiveShape | undefined {
  if (!model || model.path !== undefined) return undefined;
  const [x, y, z] = model.size;
  return x + y + z > 0 ? SHAPES.get(model.primitiveType) : undefined;
}
