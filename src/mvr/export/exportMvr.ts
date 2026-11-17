import { strToU8, zipSync, type Zippable } from 'fflate';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { summarizeExport, type MvrExportSummary } from './MvrExportSummary';
import { writeScene } from './writeScene';

/** Optional extra content of an export. */
export interface MvrExportOptions {
  /** Mesh bytes by the file name the scene refers to (`luma_<kind>_<id>.glb`); Part B renders them. */
  readonly meshes?: ReadonlyMap<string, Uint8Array>;
}

/** An exported `.mvr` file and what it holds. */
export interface MvrExport {
  readonly bytes: Uint8Array;
  readonly summary: MvrExportSummary;
}

const SCENE_FILE = 'GeneralSceneDescription.xml';

/** A fixed ZIP entry time: with the real time, two exports of one design would differ in their bytes. */
const ZIP_TIME = new Date(2000, 0, 1);

/**
 * Exports a design as an MVR 1.6 file: `GeneralSceneDescription.xml` (fixtures, trusses, stage objects and the luma
 * data that brings the stage back to the desk) in a ZIP, with no three.js, so it runs anywhere. No GDTF files are
 * embedded, because the desk's fixtures are procedural; each fixture names the real product's GDTF instead. Mesh
 * files are added only when `options.meshes` holds them; until Part B renders them, the scene names files the
 * archive does not hold, and the summary says so. The same design always gives the same bytes.
 */
export function exportMvr(design: StageDesign, options: MvrExportOptions = {}): MvrExport {
  const scene = writeScene(design);
  const files: Zippable = { [SCENE_FILE]: strToU8(scene.xml) };
  const meshes = [...(options.meshes ?? new Map<string, Uint8Array>())];
  for (const [name, bytes] of meshes) files[name] = [bytes, { level: 0 }];
  const bytes = zipSync(files, { mtime: ZIP_TIME });
  return {
    bytes,
    summary: summarizeExport(
      scene,
      meshes.map(([name]) => name),
    ),
  };
}
