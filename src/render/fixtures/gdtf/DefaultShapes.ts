import { BoxGeometry, CylinderGeometry, SphereGeometry, type BufferGeometry } from 'three';
import type { GdtfNode } from '../../../mvr/gdtf/GdtfBody';
import { primitiveShape, type PrimitiveShape } from '../../../mvr/gdtf/primitiveShapes';
import { fitMatrix } from './fitToModel';
import type { PlacedGeometry } from './mergePlain';
import type { ParseMesh } from './parseGdtfMesh';

/** The bytes of one default mesh of the GDTF specification by its file name; undefined when it cannot be had. */
export type DefaultMeshSource = (file: string) => Promise<Uint8Array | undefined>;

/** The sides of a round solid: enough to read as round at the size of a lens or a ball on a stage. */
const SIDES = 24;

/** A plain solid one unit large, in the app frame. Also the stand-in for a default mesh that cannot be loaded. */
function solid({ solid: kind, box }: PrimitiveShape): BufferGeometry {
  // three.js draws a cylinder about Y, the app's up axis, which is the GDTF Z (the model `Height`)
  if (kind === 'cylinder') return new CylinderGeometry(0.5, 0.5, 1, SIDES);
  if (kind === 'sphere') return new SphereGeometry(0.5, SIDES, SIDES / 2);
  // the box of the shape, so a stand-in fills the same place as the mesh: GDTF (x, y, z) is the app (x, z, -y)
  const { min, max } = box;
  const centre = [0, 2, 1].map((axis) => ((min[axis] ?? 0) + (max[axis] ?? 0)) / 2);
  const [x = 0, y = 0, z = 0] = [0, 2, 1].map((axis) => (max[axis] ?? 0) - (min[axis] ?? 0));
  return new BoxGeometry(x, y, z).translate(centre[0] ?? 0, centre[1] ?? 0, -(centre[2] ?? 0));
}

/**
 * The default shapes of GDTF for the parts of a rig that name a `PrimitiveType` and have no mesh file
 * (`primitiveShape`): the default meshes of the specification and the three plain solids. One geometry per primitive
 * type for the whole rig; each part places it with the scale that fits it to its model size, about the origin of the
 * shape (GDTF: "The mesh is explicitly scaled to this dimension"), and the prototype merges it like a model file.
 * A default mesh is asked for when the first tree needs it, so a rig without such a part loads none.
 */
export class DefaultShapes {
  readonly #parse: ParseMesh;
  readonly #source: DefaultMeshSource;
  /** The default mesh files that cannot be loaded or parsed; their parts are drawn as the box of the shape. */
  readonly #failed: string[];
  readonly #shapes = new Map<PrimitiveShape, BufferGeometry>();

  constructor(parse: ParseMesh, source: DefaultMeshSource, failed: string[]) {
    this.#parse = parse;
    this.#source = source;
    this.#failed = failed;
  }

  /** Makes the shape of every part under `node` that needs one, once per primitive type. */
  async prepare(node: GdtfNode): Promise<void> {
    const shape = primitiveShape(node.model);
    if (shape && !this.#shapes.has(shape)) this.#shapes.set(shape, (await this.#mesh(shape)) ?? solid(shape));
    for (const child of node.children) await this.prepare(child);
  }

  /** The shape of a part fitted to its model size; undefined for a part that has none. */
  part(node: GdtfNode): PlacedGeometry | undefined {
    const shape = primitiveShape(node.model);
    const geometry = shape && this.#shapes.get(shape);
    return geometry && { geometry, matrix: fitMatrix(geometry, node.model?.size ?? [0, 0, 0]) };
  }

  async #mesh({ mesh }: PrimitiveShape): Promise<BufferGeometry | undefined> {
    if (mesh === undefined) return undefined;
    const bytes = await this.#source(mesh).catch(() => undefined);
    const parsed = bytes && (await this.#parse(mesh, bytes).catch(() => undefined));
    if (!parsed) this.#failed.push(mesh);
    return parsed;
  }
}
