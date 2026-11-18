import type { MvrArchive } from '../archive/MvrArchive';
import { hasBakedPose } from '../gdtf/gdtfBakedPose';
import { gdtfBudget, readGdtfEntries, type ByteBudget } from '../gdtf/gdtfEntries';
import { MvrError, type MvrWarning } from '../MvrWarning';

/** The model files of the GDTFs a scene uses. */
export interface GdtfMeshRead {
  /** Model file bytes by `meshKey`. */
  readonly meshes: ReadonlyMap<string, Uint8Array>;
  /** The keys of the GLB files with a baked pose. */
  readonly baked: ReadonlySet<string>;
  /** One `bad-gdtf` warning per GDTF file whose model files could not be unpacked. */
  readonly warnings: readonly MvrWarning[];
}

/** The key of one GDTF model file in the import result: the GDTF file name in the MVR, then the path inside it. */
export const meshKey = (gdtfFile: string, path: string): string => `${gdtfFile}/${path}`;

/**
 * Unpacks the model files that fixtures need: `uses` gives, per GDTF file name, the entry paths its geometry trees
 * name. Each GDTF is opened once, however many fixtures or specs use it, and each file is held once. All GDTFs of an
 * import share one byte budget. A GDTF over it, or one that is no ZIP, keeps its fixtures and gets a warning: one bad
 * fixture file must not stop the import, and its fixtures can still be drawn as boxes.
 */
export function gdtfMeshes(
  archive: MvrArchive,
  uses: ReadonlyMap<string, ReadonlySet<string>>,
  budget: ByteBudget = gdtfBudget(),
): GdtfMeshRead {
  const meshes = new Map<string, Uint8Array>();
  const baked = new Set<string>();
  const warnings: MvrWarning[] = [];
  for (const [file, paths] of uses) {
    const bytes = paths.size === 0 ? undefined : archive.file(file);
    if (bytes === undefined) continue;
    let entries: [string, Uint8Array][] = [];
    try {
      entries = Object.entries(readGdtfEntries(bytes, paths, budget));
    } catch (error) {
      if (!(error instanceof MvrError)) throw error;
      const why = `cannot be read, so its fixtures get no GDTF model. ${error.message}`;
      warnings.push({ code: 'bad-gdtf', message: `The model files of the GDTF file "${file}" ${why}`, ref: file });
    }
    for (const [path, data] of entries) {
      meshes.set(meshKey(file, path), data);
      if (path.toLowerCase().endsWith('.glb') && hasBakedPose(data)) baked.add(meshKey(file, path));
    }
  }
  return { meshes, baked, warnings };
}
