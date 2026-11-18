import type { StageDesign } from '../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr, type MvrImport } from '../../../src/mvr/index.ts';
import { exportMeshes } from '../../../src/render/mvr/export/exportMeshes.ts';

/** An export with rendered meshes, read back by the import, and the mesh files the export wrote. */
export interface ExportRoundTrip {
  readonly meshes: ReadonlyMap<string, Uint8Array>;
  readonly result: MvrImport;
}

/** Exports `design` with its meshes (B1) and imports the file again, as a console and then the desk would. */
export async function exportRoundTrip(design: StageDesign): Promise<ExportRoundTrip> {
  const meshes = await exportMeshes(design);
  const { bytes } = exportMvr(design, { meshes });
  return { meshes, result: await importMvr(bytes, { name: 'round trip' }) };
}
