import { Mesh, MeshStandardMaterial } from 'three';
import type { StageDesign } from '../../../domain/stage/StageDesign';
import { meshShapes, type MeshShape } from '../../../mvr/index';
import { shapeGeometry } from './shapeGeometry';

/** Body colours a console shows: metal trusses, a dark deck and risers, black screen cabinets. */
const SHAPE_COLORS: Readonly<Record<MeshShape['kind'], number>> = {
  truss: 0x9a9ea3,
  deck: 0x2b2b2b,
  riser: 0x3a3a3a,
  screen: 0x101010,
};

/** One body as binary glTF; the exporter is passed in so it is imported once per export. */
async function writeGlb(shape: MeshShape, exporter: GltfExporter): Promise<Uint8Array> {
  const material = new MeshStandardMaterial({ color: SHAPE_COLORS[shape.kind] });
  const mesh = new Mesh(shapeGeometry(shape), material);
  try {
    const glb = await exporter.parseAsync(mesh, { binary: true });
    if (!(glb instanceof ArrayBuffer)) throw new TypeError(`exportMeshes: no binary glTF for a ${shape.kind}`);
    return new Uint8Array(glb);
  } finally {
    mesh.geometry.dispose();
    material.dispose();
  }
}

type GltfExporter = InstanceType<typeof import('three/examples/jsm/exporters/GLTFExporter.js').GLTFExporter>;

/**
 * The mesh files of an MVR export: each distinct body of the design (`meshShapes`) once, as binary glTF in its
 * object frame, under the name the scene gives it. Pass the result as `exportMvr(design, { meshes })`. The
 * exporter is imported on first use, so the app does not load it until the user exports.
 */
export async function exportMeshes(design: StageDesign): Promise<ReadonlyMap<string, Uint8Array>> {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter();
  const meshes = new Map<string, Uint8Array>();
  for (const [file, shape] of meshShapes(design)) meshes.set(file, await writeGlb(shape, exporter));
  return meshes;
}
