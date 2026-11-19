import type { StageDesign } from '../../../domain/stage/StageDesign';
import type { MvrStore } from '../../../io/mvrStore';
import type { MvrExportSummary } from '../../../mvr';
import { mvrFileName } from './mvrFileName';
import { storedMvrOf } from './storedMvrOf';

/** An export ready to download: the bytes, the file name and what the summary toast reports. */
export interface MvrExportFile {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly summary: MvrExportSummary;
}

/**
 * What the export needs from render and io. ui does not import render, so the wiring passes render's
 * `exportMeshes`, which writes the mesh file of every body the scene names. `store` holds the original file of an
 * imported design; without it (or without the file in it) the export cannot keep the file's scenery.
 */
export interface MvrExportDeps {
  exportMeshes(design: StageDesign): Promise<ReadonlyMap<string, Uint8Array>>;
  readonly store?: Pick<MvrStore, 'get'>;
}

/** The stored original of an imported design, or `undefined` when there is none to patch. */
async function originalOf(
  design: StageDesign,
  store: Pick<MvrStore, 'get'> | undefined,
): Promise<Uint8Array | undefined> {
  if (!design.mvr || !store) return undefined;
  const stored = await storedMvrOf(design, store);
  return stored.kind === 'found' ? stored.bytes : undefined;
}

/**
 * Exports `design` as an `.mvr` file for the Export MVR button (contract §8). An imported design with its stored
 * original is written from that file, which already holds its meshes, so no desk meshes are made for it; any other
 * design gets the mesh files the scene names. The writer is a lazy chunk (`import()`), like the importer, so the boot
 * bundle does not grow; the download itself stays with the DOM panel.
 */
export async function exportMvrFile(
  design: StageDesign,
  showName: string,
  deps: MvrExportDeps,
): Promise<MvrExportFile> {
  const original = await originalOf(design, deps.store);
  const meshes = original ? Promise.resolve(new Map<string, Uint8Array>()) : deps.exportMeshes(design);
  const [{ exportMvr }, meshFiles] = await Promise.all([import('../../../mvr'), meshes]);
  const { bytes, summary } = exportMvr(design, { meshes: meshFiles, ...(original ? { original } : {}) });
  return { bytes, fileName: mvrFileName(showName), summary };
}
