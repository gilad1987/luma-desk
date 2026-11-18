import { foldWarnings } from './foldWarnings';
import { toStageDesign } from './design/toStageDesign';
import { gdtfBudget } from './gdtf/gdtfEntries';
import { withHiddenLayers } from './import/farLine';
import { withFileData } from './import/fileDataStep';
import { fixtureBodies } from './import/fixtureBodies';
import { withoutLightGeometry } from './import/fixtureGeometry';
import { placeBodies } from './import/placeBodies';
import { importProxies } from './import/importProxies';
import { lumaDesign } from './import/lumaDesign';
import { meshBytes } from './import/meshBytes';
import { openScene } from './import/openScene';
import { readMeshBoxes } from './import/readMeshBoxes';
import { readLumaData } from './import/readLumaData';
import { resolveFixtures } from './import/resolveFixtures';
import { rigOptics } from './import/rigOptics';
import { summarize } from './import/summarize';
import { versionWarnings } from './import/versionWarnings';
import { withoutLumaMeshes } from './import/withLumaData';
import { withScreenEvidence } from './import/withScreenEvidence';
import type { MvrImport } from './MvrImport';
import type { MvrWarning } from './MvrWarning';
import { walkScene } from './scene/walkScene';

/** What the caller knows about the file that the bytes do not hold. */
export interface MvrImportOptions {
  /** The design name the UI shows, usually the file name. */
  readonly name: string;
  /** SHA-256 of `bytes`, the IndexedDB key the show stores to find the original file again. */
  readonly fileHash?: string;
}

/** The synchronous import; `importMvr` wraps it so a thrown `MvrError` becomes a rejected promise. */
function importNow(bytes: Uint8Array, options: MvrImportOptions): MvrImport {
  const { archive, doc } = openScene(bytes);
  const luma = readLumaData(doc);
  const walked = walkScene(doc);
  const bare = withoutLumaMeshes(walked, luma);
  const rig = resolveFixtures(archive, bare.fixtures);
  const lean = withoutLightGeometry(bare, rig.fixtures);
  const budget = gdtfBudget();
  const bodies = fixtureBodies(archive, rig, luma !== undefined, budget);
  const meshWarnings: MvrWarning[] = [...lean.warnings, ...bodies.warnings];
  const meshBoxes = readMeshBoxes(archive, lean.scene.placements, (warning) => meshWarnings.push(warning));
  const scene = withScreenEvidence(lean.scene, meshBoxes, archive);
  const meshFiles = meshBytes(archive, scene.placements, (warning) => meshWarnings.push(warning));
  const fixed = luma ? { fixed: { offset: luma.offset, deck: luma.deck } } : {};
  const result = toStageDesign({ ...options, scene, fixtures: rig.fixtures, meshBoxes, ...fixed });
  const design = lumaDesign(result, luma, doc, walked.fixtures);
  const noGeometry = design.warnings.some((warning) => warning.code === 'no-geometry');
  // A file with the desk's own data brings the user's layer choice, which the outside rule must not change.
  const proxied = importProxies(scene.proxies, design.design, result.geometry, luma?.hiddenLayers === undefined);
  const placed = placeBodies(withHiddenLayers(design.design, proxied.hidden), bodies.bodySizes);
  const optics = withFileData(rigOptics(archive, rig, placed, budget), rig, walked.auxNames, luma !== undefined);
  return {
    design: optics.design,
    geometry: proxied.geometry,
    ...meshFiles,
    gdtfMeshes: bodies.gdtfMeshes,
    bodies: bodies.bodies,
    goboImages: optics.images,
    summary: { ...summarize(walked, rig, noGeometry, bodies.lines), ...optics.summary },
    warnings: foldWarnings([
      ...versionWarnings(doc),
      ...scene.warnings,
      ...proxied.warnings,
      ...rig.gdtfWarnings,
      ...rig.patchWarnings,
      ...meshWarnings,
      ...optics.warnings,
      ...design.warnings,
    ]),
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
