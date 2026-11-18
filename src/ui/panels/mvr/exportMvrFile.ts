import type { StageDesign } from '../../../domain/stage/StageDesign';
import type { MvrExportSummary } from '../../../mvr';

/** An export ready to download: the bytes, the file name and what the summary toast reports. */
export interface MvrExportFile {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly summary: MvrExportSummary;
}

/** Characters Windows and macOS refuse in a file name; a show name may hold them. */
const UNSAFE_NAME = /[\\/:*?"<>|]/g;

/** The name a show without one downloads as. */
const FALLBACK_NAME = 'luma-desk';

/** `<show name>.mvr` (contract §8), with characters a file system refuses replaced; Hebrew names stay as they are. */
function mvrFileName(showName: string): string {
  const name = showName.trim().replace(UNSAFE_NAME, '_');
  return `${name === '' ? FALLBACK_NAME : name}.mvr`;
}

/**
 * Exports `design` as an `.mvr` file for the Export MVR button (contract §8). The writer is a lazy chunk
 * (`import()`), like the importer, so the boot bundle does not grow; the download itself stays with the DOM panel.
 */
export async function exportMvrFile(design: StageDesign, showName: string): Promise<MvrExportFile> {
  const { exportMvr } = await import('../../../mvr');
  const { bytes, summary } = exportMvr(design);
  return { bytes, fileName: mvrFileName(showName), summary };
}
