import type { StageDesign } from '../../domain/stage/StageDesign';
import type { ToastAction } from '../../engine/events';
import type { MvrStore } from '../../io/mvrStore';
import type { Modal } from '../../ui/shared';
import { openExportSummary } from '../../ui/panels/mvr/openExportSummary';
import { he } from '../../i18n/he';
import { exportMvrFile } from '../../ui/panels/mvr/exportMvrFile';

/** Where an export goes: the download of the file and the toast of its summary. */
export interface MvrExportOut {
  /** The toast; `action` is the one button it may carry, here the way to the summary dialog. */
  readonly toast: (text: string, action?: ToastAction) => void;
  readonly download: (blob: Blob, fileName: string) => void;
  /** The store of original files, so an imported design is exported from its original and keeps its scenery. */
  readonly store?: Pick<MvrStore, 'get'>;
  /** The dialog the summary opens in: by itself for a loss or a warning, else from the toast's button. */
  readonly modal?: () => Pick<Modal, 'open' | 'close'>;
}

/**
 * Downloads `design` as `<name>.mvr` with the mesh files of its bodies, then toasts the fixture count (contract §8).
 * The show has no name field, so the file takes the stage source name without a final `.mvr`: an imported `Rig.mvr`
 * exports as `Rig.mvr` again and a template under its template name. The mesh writer is a lazy chunk, like the
 * MVR writer, so the boot bundle does not grow.
 */
export async function exportStageMvr(
  design: StageDesign,
  { toast, download, store, modal }: MvrExportOut,
): Promise<void> {
  const showName = design.source.name.replace(/\.mvr$/i, '');
  const { exportMeshes } = await import('../../render/mvr/export/exportMeshes');
  const { bytes, fileName, summary } = await exportMvrFile(design, showName, {
    exportMeshes,
    ...(store ? { store } : {}),
  });
  // the ZIP writer types its bytes over any buffer and a Blob takes ArrayBuffer views only, so slice() copies them
  download(new Blob([bytes.slice()], { type: 'application/octet-stream' }), fileName);
  const text = summary.kept ? he.mvr.exportedFromFile(summary.fixtures) : he.mvr.exported(summary.fixtures);
  const { losses, warnings } = summary.report;
  if (!modal) return toast(text);
  // The dialog opens by itself only for a loss or for something to check, so a real loss is never one line among
  // many. For information alone the toast carries a button to it: the kept and changed counts stay one click away.
  if (losses.length + warnings.length > 0) {
    toast(text);
    openExportSummary(modal(), summary);
  } else toast(text, { label: he.mvr.exportDetails, run: () => openExportSummary(modal(), summary) });
}
