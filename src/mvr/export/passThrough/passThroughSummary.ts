import { findGdtfMatch } from '../../gdtf/findGdtf';
import { childText, descendantElements } from '../../xml/elements';
import type { KeptCounts, MvrExportSummary } from '../MvrExportSummary';
import type { OriginalArchive } from './readOriginal';
import type { StageDesign } from '../../../domain/stage/StageDesign';
import { flatLines, line } from '../exportReport';
import { changeNotes, reportOf } from './passThroughNotes';
import type { ScenePatch } from './patchScene';

/** Scene elements that place scenery; groups and symbol instances are counted on their own. */
const OBJECT_TAGS = ['SceneObject', 'Support', 'VideoScreen', 'Projector'];
const MESH_FILE = /\.(3ds|glb|gltf|obj)$/i;

/**
 * The GDTF names fixtures refer to that no root-level archive entry serves, by the import's own rules
 * (`findGdtfMatch`): a file the import finds, such as Vectorworks' `Maker@Model.gdtf` for `Model`, is not missing.
 */
function missingGdtfs(doc: Document, archive: OriginalArchive): string[] {
  const names = archive.entries.map((entry) => entry.name).filter((name) => !name.includes('/'));
  const specs = descendantElements(doc.documentElement, 'Fixture').map((el) => childText(el, 'GDTFSpec') ?? '');
  const missing = specs.filter((spec) => spec !== '' && findGdtfMatch(names, spec) === undefined);
  return [...new Set(missing)];
}

/** One sentence with every count the export kept. */
function keptNote(kept: KeptCounts): string {
  const { objects, trusses, groups, symbols, layers, classes, gdtfFiles, meshFiles } = kept;
  return (
    `Kept from the original file: ${objects} objects, ${trusses} trusses, ${groups} groups, ${symbols} symbols, ` +
    `${layers} layers, ${classes} classes, ${gdtfFiles} GDTF files, ${meshFiles} mesh files.`
  );
}

/**
 * The summary of a pass-through export: what the original file kept, what the desk changed, and every loss by name,
 * so the user knows exactly what a console will get.
 */
export function summarizePassThrough(
  doc: Document,
  archive: OriginalArchive,
  scene: ScenePatch,
  design: StageDesign,
): MvrExportSummary {
  const count = (tag: string): number => descendantElements(doc.documentElement, tag).length;
  const objects = OBJECT_TAGS.reduce((sum, tag) => sum + count(tag), 0);
  const geometryFiles = archive.entries.map((entry) => entry.name).filter((name) => MESH_FILE.test(name));
  const gdtfFiles = archive.entries.filter((entry) => entry.name.toLowerCase().endsWith('.gdtf')).length;
  const [trusses, groups, symbols, layers, classes] = ['Truss', 'GroupObject', 'Symbol', 'Layer', 'Class'].map(count);
  const kept = { objects, trusses: trusses ?? 0, groups: groups ?? 0, symbols: symbols ?? 0, layers: layers ?? 0 };
  const all = { ...kept, classes: classes ?? 0, gdtfFiles, meshFiles: geometryFiles.length };
  const found = reportOf(scene, archive, design, missingGdtfs(doc, archive));
  const losses = flatLines([...found.information, ...found.losses, ...found.warnings]);
  const head = [keptNote(all), ...changeNotes(scene)];
  return {
    fixtures: count('Fixture'),
    autoPatched: scene.plan.autoPatched,
    trusses: all.trusses,
    objects,
    layers: all.layers,
    geometryFiles,
    warnings: scene.plan.warnings,
    notes: [...head, ...losses],
    report: { ...found, information: [...head.map(line), ...found.information] },
    kept: all,
    changes: scene.changes,
  };
}
