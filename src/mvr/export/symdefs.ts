import type { ExportContext } from './ExportContext';
import type { StageObject } from './stageObjects';
import { xmlElement } from './xmlWriter';

/** The uuid of the Symdef that holds mesh `file`; every object with that body places it through a `<Symbol>`. */
export function symdefUuid(file: string, context: ExportContext): string {
  return context.uuidOf('symdef', file);
}

/**
 * The `<AUXData>` with one `<Symdef>` per distinct mesh file of `objects`, or nothing when there are no objects. A
 * Symdef lets twenty identical trusses share one mesh file and lets a reader instance it, which MVR intends for
 * repeated bodies; its `<Geometry3D>` has no matrix, so the mesh frame is the object frame.
 */
export function writeSymdefs(objects: readonly StageObject[], context: ExportContext): string[] {
  const files = [...new Set(objects.map((object) => object.file))];
  if (files.length === 0) return [];
  const symdefs = files.map((file) => {
    const childList = xmlElement('ChildList', {}, [xmlElement('Geometry3D', { fileName: file }, [])]);
    return xmlElement('Symdef', { uuid: symdefUuid(file, context), name: file }, [childList]);
  });
  return [xmlElement('AUXData', {}, symdefs)];
}
