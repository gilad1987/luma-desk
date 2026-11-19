import { strToU8, zipSync, type Zippable } from 'fflate';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { summarizeExport, type MvrExportSummary } from './MvrExportSummary';
import { passThroughExport } from './passThrough/passThroughExport';
import { plainLosses } from './plainLosses';
import { writeScene } from './writeScene';

/** Optional extra content of an export. */
export interface MvrExportOptions {
  /** Mesh bytes by the file name the scene refers to (`luma_<kind>_<hash>.glb`); render's `exportMeshes` makes them. */
  readonly meshes?: ReadonlyMap<string, Uint8Array>;
  /** The original `.mvr` bytes of an imported design, from the store; with them the export patches the original. */
  readonly original?: Uint8Array;
}

/** An exported `.mvr` file and what it holds. */
export interface MvrExport {
  readonly bytes: Uint8Array;
  readonly summary: MvrExportSummary;
}

const SCENE_FILE = 'GeneralSceneDescription.xml';

/** A fixed ZIP entry time: with the real time, two exports of one design would differ in their bytes. */
const ZIP_TIME = new Date(2000, 0, 1);

/** Why an imported design is written by the plain writer, which has no scenery of the file: a loss the user must see. */
const NOT_STORED =
  'The scenery of the imported file (scene objects, groups, symbols, classes, mesh and GDTF files) is not in this ' +
  'export, because the original file is not stored in this browser; import it again to keep it.';

/** The pass-through export, or the reason it could not run (a damaged or oversized original). */
function fromOriginal(design: StageDesign, original: Uint8Array): MvrExport | string {
  try {
    return passThroughExport(design, original);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // The note has one wording for every cause, so the real error and its stack are logged once for whoever debugs it.
    console.warn('MVR export from the original file failed; the plain writer ran instead.', error);
    return `The original file could not be used (${detail}); its scenery, mesh and GDTF files are not in this export.`;
  }
}

/**
 * Exports a design as an MVR 1.6 file. An imported design whose original file is at hand is written from that file
 * (`passThroughExport`), so its scenery, layers, classes, groups, symbols, every DMX break and its GDTF and mesh
 * files survive. Otherwise the plain writer runs: `GeneralSceneDescription.xml` (fixtures, trusses, stage objects and
 * the luma data that brings the stage back to the desk) in a ZIP, with no GDTF files, because the desk's fixtures are
 * procedural; each fixture names the real product's GDTF instead. Mesh files are added only when `options.meshes`
 * holds them (`meshShapes` lists the names). An imported design without its original lists that loss in the notes.
 */
export function exportMvr(design: StageDesign, options: MvrExportOptions = {}): MvrExport {
  const passed = design.mvr && options.original ? fromOriginal(design, options.original) : undefined;
  if (typeof passed === 'object') return passed;
  const reason = passed ?? NOT_STORED;
  const losses = design.mvr ? [reason, ...plainLosses(design)] : [];
  const scene = writeScene(design);
  const files: Zippable = { [SCENE_FILE]: strToU8(scene.xml) };
  const meshes = [...(options.meshes ?? new Map<string, Uint8Array>())];
  for (const [name, bytes] of meshes) files[name] = [bytes, { level: 0 }];
  const bytes = zipSync(files, { mtime: ZIP_TIME });
  const geometry = meshes.map(([name]) => name);
  return { bytes, summary: summarizeExport(scene, geometry, losses) };
}
