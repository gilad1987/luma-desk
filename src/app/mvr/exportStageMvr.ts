import type { StageDesign } from '../../domain/stage/StageDesign';
import { he } from '../../i18n/he';
import { exportMvrFile } from '../../ui/panels/mvr/exportMvrFile';

/** Where an export goes: the download of the file and the toast of its summary. */
export interface MvrExportOut {
  readonly toast: (text: string) => void;
  readonly download: (blob: Blob, fileName: string) => void;
}

/**
 * Downloads `design` as `<name>.mvr` with the mesh files of its bodies, then toasts the fixture count (contract §8).
 * The show has no name field, so the file takes the stage source name without a final `.mvr`: an imported `Rig.mvr`
 * exports as `Rig.mvr` again and a template under its template name. The mesh writer is a lazy chunk, like the
 * MVR writer, so the boot bundle does not grow.
 */
export async function exportStageMvr(design: StageDesign, { toast, download }: MvrExportOut): Promise<void> {
  const showName = design.source.name.replace(/\.mvr$/i, '');
  const { exportMeshes } = await import('../../render/mvr/export/exportMeshes');
  const { bytes, fileName, summary } = await exportMvrFile(design, showName, { exportMeshes });
  // the ZIP writer types its bytes over any buffer and a Blob takes ArrayBuffer views only, so slice() copies them
  download(new Blob([bytes.slice()], { type: 'application/octet-stream' }), fileName);
  toast(he.mvr.exported(summary.fixtures));
}
