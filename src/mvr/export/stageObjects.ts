import type { ExportContext } from './ExportContext';
import { meshFileOf } from './MeshShape';
import { objectSpecs, type ObjectSpec } from './objectSpecs';
import { poseMatrix } from './poseMatrix';
import { symdefUuid } from './symdefs';
import { xmlElement, xmlText } from './xmlWriter';

/** One written stage object: its XML, the scenery part whose layer holds it and the mesh file it names. */
export interface StageObject extends Pick<ObjectSpec, 'tag' | 'part'> {
  /** The mesh file its Symdef names; the ZIP holds it only when the caller passes its bytes (see `exportMeshes`). */
  readonly file: string;
  readonly xml: string;
}

/** The tags whose MVR element must hold a `<FixtureID>` (spec Tables 28 and 32), even an empty one. */
const NEEDS_FIXTURE_ID: ReadonlySet<ObjectSpec['tag']> = new Set(['Truss', 'VideoScreen']);

/** One object element with its matrix, a `<Symbol>` of its mesh's Symdef and, where the XSD needs it, an empty id. */
function writeObject(spec: ObjectSpec, context: ExportContext): StageObject {
  const file = meshFileOf(spec.shape);
  const uuid = context.uuidOf(spec.shape.kind, spec.id);
  const symbol = { uuid: context.uuidOf('symbol', uuid), symdef: symdefUuid(file, context) };
  const children = [
    xmlText('Matrix', poseMatrix(spec.position, spec.rotation, context.offset)),
    xmlElement('Geometries', {}, [xmlElement('Symbol', symbol, [])]),
    ...(NEEDS_FIXTURE_ID.has(spec.tag) ? [xmlText('FixtureID', '')] : []),
  ];
  return { part: spec.part, tag: spec.tag, file, xml: xmlElement(spec.tag, { uuid, name: spec.name }, children) };
}

/**
 * The trusses, deck, risers and screens of the design as `<Truss>`, `<SceneObject>` and `<VideoScreen>` elements.
 * Each places the Symdef of its `luma_<kind>_<hash>.glb` mesh, so equal bodies share one file. Without the mesh bytes
 * a reader shows the object without a body, and the luma data still rebuilds it in the desk.
 */
export function stageObjects(context: ExportContext): StageObject[] {
  return objectSpecs(context.design).map((spec) => writeObject(spec, context));
}
