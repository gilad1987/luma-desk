import { LUMA_MESH_PREFIX } from '../luma/lumaData';
import type { ExportContext } from './ExportContext';
import { objectSpecs, type ObjectSpec } from './objectSpecs';
import { poseMatrix } from './poseMatrix';
import { stableUuid } from './stableUuid';
import { xmlElement, xmlText } from './xmlWriter';

/** One written stage object: its XML, the scenery part whose layer holds it and the mesh file it names. */
export interface StageObject extends Pick<ObjectSpec, 'tag' | 'part'> {
  /** The `<Geometry3D fileName>`; the ZIP holds it only when the caller passes its bytes (geometry is Part B). */
  readonly file: string;
  readonly xml: string;
}

/** Characters a mesh file name may not hold: MVR readers look files up by plain name in the archive root. */
const UNSAFE = /[^A-Za-z0-9_-]/g;

/**
 * The mesh file name of an object: deterministic, so Part B can render the file under the same name later, and
 * limited to letters, digits, `_` and `-`. When that limit changed the id, a short hash of the raw id follows, so ids
 * such as `a b` and `a_b`, or two Hebrew names, never share one file.
 */
export function geometryFile(kind: string, id: string): string {
  const safe = id.replace(UNSAFE, '_');
  const tag = safe === id ? '' : `_${stableUuid(id).slice(0, 8).toLowerCase()}`;
  return `${LUMA_MESH_PREFIX}${kind}_${safe}${tag}.glb`;
}

/** The tags whose MVR element must hold a `<FixtureID>` (spec Tables 28 and 32), even an empty one. */
const NEEDS_FIXTURE_ID: ReadonlySet<ObjectSpec['tag']> = new Set(['Truss', 'VideoScreen']);

/** One object element with its matrix, a reference to its mesh file and, where the XSD needs it, an empty id. */
function writeObject(spec: ObjectSpec, context: ExportContext): StageObject {
  const file = geometryFile(spec.kind, spec.id);
  const children = [
    xmlText('Matrix', poseMatrix(spec.position, spec.rotation, context.offset)),
    xmlElement('Geometries', {}, [xmlElement('Geometry3D', { fileName: file }, [])]),
    ...(NEEDS_FIXTURE_ID.has(spec.tag) ? [xmlText('FixtureID', '')] : []),
  ];
  const uuid = context.uuidOf(spec.kind, spec.id);
  return { part: spec.part, tag: spec.tag, file, xml: xmlElement(spec.tag, { uuid, name: spec.name }, children) };
}

/**
 * The trusses, deck, risers and screens of the design as `<Truss>`, `<SceneObject>` and `<VideoScreen>` elements.
 * Each names a `luma_<kind>_<id>.glb` mesh, which the archive does not hold until Part B renders the meshes; a reader
 * then shows the object without a body, and the luma data still rebuilds it in the desk.
 */
export function stageObjects(context: ExportContext): StageObject[] {
  return objectSpecs(context.design).map((spec) => writeObject(spec, context));
}
