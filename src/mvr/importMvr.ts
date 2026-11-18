import { MvrArchive } from './archive/MvrArchive';
import { toStageDesign, type DesignResult } from './design/toStageDesign';
import { applyLumaData, type LumaApplied } from './import/applyLumaData';
import { meshBytes } from './import/meshBytes';
import { readLumaData } from './import/readLumaData';
import { resolveFixtures } from './import/resolveFixtures';
import { summarize } from './import/summarize';
import { LUMA_MESH_PREFIX, type LumaStageData } from './luma/lumaData';
import type { Aabb } from './math/Aabb';
import { meshBounds } from './mesh/meshBounds';
import type { MvrImport } from './MvrImport';
import { MvrError, type MvrWarning } from './MvrWarning';
import type { MeshPlacement } from './scene/MvrScene';
import { walkScene } from './scene/walkScene';
import { parseXml } from './xml/parseXml';

/** The scene file every MVR holds at its root (MVR spec); the archive finds it in any case. */
const SCENE_FILE = 'GeneralSceneDescription.xml';

/** What the caller knows about the file that the bytes do not hold. */
export interface MvrImportOptions {
  /** The design name the UI shows, usually the file name. */
  readonly name: string;
  /** SHA-256 of `bytes`, the IndexedDB key the show stores to find the original file again. */
  readonly fileHash?: string;
}

/**
 * Whether a mesh warning reaches the user. A luma export names its own `luma_*` meshes before Part B puts them in the
 * archive, and the desk rebuilds those objects from the luma data, so their absence is not a problem there.
 */
function keepMeshWarning(warning: MvrWarning, hasLumaData: boolean): boolean {
  const lumaMesh = warning.code === 'missing-mesh' && (warning.ref ?? '').startsWith(LUMA_MESH_PREFIX);
  return !(hasLumaData && lumaMesh);
}

/** Local bounds of every distinct mesh file; a file that cannot be read gets no entry and a warning. */
function readMeshBoxes(
  archive: MvrArchive,
  placements: readonly MeshPlacement[],
  warn: (warning: MvrWarning) => void,
): ReadonlyMap<string, Aabb> {
  const boxes = new Map<string, Aabb>();
  for (const file of new Set(placements.map((placement) => placement.file))) {
    const box = meshBounds(archive, file, warn);
    if (box) boxes.set(file, box);
  }
  return boxes;
}

/**
 * The design step's result with the luma data applied. The luma data rebuilds the stage parts, so a file without any
 * mesh still shows a whole stage and its `no-geometry` warning would be noise.
 */
function withLumaData(result: DesignResult, luma: LumaStageData | undefined): LumaApplied {
  if (!luma) return result;
  const applied = applyLumaData(result.design, luma);
  const designWarnings = result.warnings.filter((warning) => warning.code !== 'no-geometry');
  return { design: applied.design, warnings: [...designWarnings, ...applied.warnings] };
}

/** The synchronous import; `importMvr` wraps it so a thrown `MvrError` becomes a rejected promise. */
function importNow(bytes: Uint8Array, options: MvrImportOptions): MvrImport {
  const archive = MvrArchive.open(bytes);
  const text = archive.text(SCENE_FILE);
  if (text === undefined) throw new MvrError('no-scene', `The file has no ${SCENE_FILE}, so it is not an MVR file.`);
  const doc = parseXml(text);
  const luma = readLumaData(doc);
  const scene = walkScene(doc);
  const rig = resolveFixtures(archive, scene.fixtures);
  const meshWarnings: MvrWarning[] = [];
  const meshBoxes = readMeshBoxes(archive, scene.placements, (warning) => {
    if (keepMeshWarning(warning, luma !== undefined)) meshWarnings.push(warning);
  });
  const fixed = luma ? { fixed: { offset: luma.offset, deck: luma.deck } } : {};
  const result = toStageDesign({ ...options, scene, fixtures: rig.fixtures, meshBoxes, ...fixed });
  const design = withLumaData(result, luma);
  const noGeometry = design.warnings.some((warning) => warning.code === 'no-geometry');
  return {
    design: design.design,
    geometry: result.geometry,
    meshes: meshBytes(archive, scene.placements),
    summary: summarize(scene, rig, noGeometry),
    warnings: [...scene.warnings, ...rig.gdtfWarnings, ...rig.patchWarnings, ...meshWarnings, ...design.warnings],
  };
}

/**
 * Reads an `.mvr` file into a stage design, the scenery to draw and a summary. Steps: archive, scene XML, scene
 * walk, GDTF per spec, patch, mesh bounds, design. It returns a promise so the UI can await it and later move the work
 * off the main thread without a new API. A file it cannot use at all rejects with `MvrError` (`not-zip`, `no-scene`,
 * `bad-xml`); smaller problems become `warnings`, ordered by step: scene, GDTF, patch, mesh, design. A file with
 * the desk's own luma data (a luma export) gets its stage back from that data and keeps its positions, unfitted.
 */
export function importMvr(bytes: Uint8Array, options: MvrImportOptions): Promise<MvrImport> {
  return Promise.resolve().then(() => importNow(bytes, options));
}
