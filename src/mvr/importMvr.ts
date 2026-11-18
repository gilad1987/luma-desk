import { MvrArchive } from './archive/MvrArchive';
import { toStageDesign } from './design/toStageDesign';
import { fixtureBodies } from './import/fixtureBodies';
import { placeBodies } from './import/placeBodies';
import { importProxies } from './import/importProxies';
import { meshBytes } from './import/meshBytes';
import { readLumaData } from './import/readLumaData';
import { resolveFixtures } from './import/resolveFixtures';
import { summarize } from './import/summarize';
import { withLumaData, withoutLumaMeshes } from './import/withLumaData';
import { withScreenEvidence } from './import/withScreenEvidence';
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

/** The synchronous import; `importMvr` wraps it so a thrown `MvrError` becomes a rejected promise. */
function importNow(bytes: Uint8Array, options: MvrImportOptions): MvrImport {
  const archive = MvrArchive.open(bytes);
  const text = archive.text(SCENE_FILE);
  if (text === undefined) throw new MvrError('no-scene', `The file has no ${SCENE_FILE}, so it is not an MVR file.`);
  const doc = parseXml(text);
  const luma = readLumaData(doc);
  const walked = walkScene(doc);
  const bare = withoutLumaMeshes(walked, luma);
  const rig = resolveFixtures(archive, bare.fixtures);
  const bodies = fixtureBodies(archive, rig);
  const meshWarnings: MvrWarning[] = [...bodies.warnings];
  const meshBoxes = readMeshBoxes(archive, bare.placements, (warning) => meshWarnings.push(warning));
  const scene = withScreenEvidence(bare, meshBoxes, archive);
  const meshFiles = meshBytes(archive, scene.placements, (warning) => meshWarnings.push(warning));
  const fixed = luma ? { fixed: { offset: luma.offset, deck: luma.deck } } : {};
  const result = toStageDesign({ ...options, scene, fixtures: rig.fixtures, meshBoxes, ...fixed });
  const design = withLumaData(result, luma);
  const noGeometry = design.warnings.some((warning) => warning.code === 'no-geometry');
  const proxied = importProxies(scene.proxies, design.design, result.geometry);
  return {
    design: placeBodies(design.design, rig.bodySizes),
    geometry: proxied.geometry,
    ...meshFiles,
    gdtfMeshes: bodies.gdtfMeshes,
    bodies: bodies.bodies,
    summary: summarize(walked, rig, noGeometry, bodies.lines),
    warnings: [
      ...scene.warnings,
      ...proxied.warnings,
      ...rig.gdtfWarnings,
      ...rig.patchWarnings,
      ...meshWarnings,
      ...design.warnings,
    ],
  };
}

/**
 * Reads an `.mvr` file into a stage design, the scenery to draw and a summary. Steps: archive, scene XML, scene
 * walk, GDTF per spec, patch, mesh bounds, design. It returns a promise so the UI can await it and later move the work
 * off the main thread without a new API. A file it cannot use at all rejects with `MvrError` (`not-zip`, `no-scene`,
 * `bad-xml`); smaller problems become `warnings`, ordered by step: scene, GDTF, patch, mesh, design. A file with
 * the desk's own luma data (a luma export) gets its stage back from that data and keeps its positions, unfitted.
 * Every fixture is then moved from its MVR mounting point to its model origin (`placeBodies`).
 */
export function importMvr(bytes: Uint8Array, options: MvrImportOptions): Promise<MvrImport> {
  return Promise.resolve().then(() => importNow(bytes, options));
}
