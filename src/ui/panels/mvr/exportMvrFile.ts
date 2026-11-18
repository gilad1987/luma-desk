import type { StageDesign } from '../../../domain/stage/StageDesign';
import type { MvrExportSummary } from '../../../mvr';
import { mvrFileName } from './mvrFileName';

/** An export ready to download: the bytes, the file name and what the summary toast reports. */
export interface MvrExportFile {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly summary: MvrExportSummary;
}

/**
 * What the export needs from render. ui does not import render, so the wiring passes render's `exportMeshes`, which
 * writes the mesh file of every body the scene names.
 */
export interface MvrExportDeps {
  exportMeshes(design: StageDesign): Promise<ReadonlyMap<string, Uint8Array>>;
}

/**
 * Exports `design` as an `.mvr` file for the Export MVR button (contract §8), with the mesh files the scene names.
 * The writer is a lazy chunk (`import()`), like the importer, so the boot bundle does not grow; the download itself
 * stays with the DOM panel.
 */
export async function exportMvrFile(
  design: StageDesign,
  showName: string,
  deps: MvrExportDeps,
): Promise<MvrExportFile> {
  const [{ exportMvr }, meshes] = await Promise.all([import('../../../mvr'), deps.exportMeshes(design)]);
  const { bytes, summary } = exportMvr(design, { meshes });
  return { bytes, fileName: mvrFileName(showName), summary };
}
