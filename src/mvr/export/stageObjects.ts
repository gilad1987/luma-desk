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

/**
 * The ids of an object the desk gives no id. The MVR 1.6 children tables of `SceneObject`, `Truss` and `VideoScreen`
 * give `FixtureID` (String) and `FixtureIDNumeric` (Integer) the count 1, so neither may be left out. The text is
 * empty and the number is 0: the desk's objects have no id to select them by, and 0 is what readers, this import
 * included, take as "no id". The spec asks that the numbers "should be unique in one scene"; an object without an id
 * cannot meet that, and a made-up number would show on a console as a real selection id.
 */
const NO_ID = [xmlText('FixtureID', ''), xmlText('FixtureIDNumeric', '0')];

/** One object element with its matrix, a `<Symbol>` of its mesh's Symdef and the ids the spec requires. */
function writeObject(spec: ObjectSpec, context: ExportContext): StageObject {
  const file = meshFileOf(spec.shape);
  const uuid = context.uuidOf(spec.shape.kind, spec.id);
  const symbol = { uuid: context.uuidOf('symbol', uuid), symdef: symdefUuid(file, context) };
  const children = [
    xmlText('Matrix', poseMatrix(spec.position, spec.rotation, context.offset)),
    xmlElement('Geometries', {}, [xmlElement('Symbol', symbol, [])]),
    ...NO_ID,
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
