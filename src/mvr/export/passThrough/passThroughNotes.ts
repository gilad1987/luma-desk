import type { StageDesign } from '../../../domain/stage/StageDesign';
import { grouped, line, type ExportReport, type ReportLine } from '../exportReport';
import { addressLossNotes } from '../patchPlanNotes';
import { freshGdtfs, integrityWarnings } from './integrityNotes';
import type { OriginalArchive } from './readOriginal';
import type { ScenePatch } from './patchScene';
import { versionNote } from './rootAttributes';

/** Sentences for what the export changed on purpose; they lose nothing. */
export function changeNotes({ changes, plan }: ScenePatch): string[] {
  const { updated, moved, added, removed, unpatched, spares } = changes;
  return [
    `Fixtures: ${updated} updated (${moved} moved, ${unpatched} unpatched), ${added} added, ${removed} removed.`,
    ...(plan.autoPatched > 0 ? [`${plan.autoPatched} added fixtures got addresses above every address in use.`] : []),
    ...(spares > 0 ? [`${spares} spare fixtures are left unpatched, as in the file.`] : []),
  ];
}

/** The sentence when it counts something. */
const some = (count: number, text: string): string[] => (count > 0 ? [text] : []);

const UNJUDGED =
  'fixtures stay in the file because this show was saved before the desk listed its imported fixtures; fixtures ' +
  'deleted on the desk are still in it. Import the file again to fix this.';
const STALE = 'fixtures have an invalid DMX patch on the desk; the addresses of the file are kept for them.';
const BUILDER =
  'Stage changes made on the desk (deck, trusses, screens) are only in the desk data of this file; other programs ' +
  'show the original scenery.';
const FILE_IDS =
  'fixtures had no usable FixtureID in the file; their file ids are kept, so a desk renumbering of them is not in ' +
  'this export.';
const OTHER_BREAKS = 'fixtures unpatched on the desk keep the addresses of their other breaks.';
const UNPLACED =
  'fixtures are inside an object whose matrix has no inverse; their Matrix text is kept as the file has it, and a ' +
  'pose from the desk is not written for them.';

/** What the export does not carry or could not judge: another program gets less than the desk shows. */
function losses(scene: ScenePatch, archive: OriginalArchive, design: StageDesign): ReportLine[] {
  const { plan, unjudged, stale } = scene;
  const outside = archive.unsafe.map(
    (name) => `The file "${name}" is not in this export: its path points outside the archive.`,
  );
  const single = [
    ...some(unjudged, `${unjudged} ${UNJUDGED}`),
    ...addressLossNotes({ ...plan, skipped: plan.skipped - stale }),
    ...some(stale, `${stale} ${STALE}`),
    ...some(design.source.kind === 'builder' ? 1 : 0, BUILDER),
  ];
  const what = 'files are not in this export because their paths point outside the archive';
  return [...grouped(what, outside), ...single.map(line)];
}

/** What the file carries but a console user must check; each kind is one line however many there are (D2). */
function warnings(scene: ScenePatch, archive: OriginalArchive, gdtfs: readonly string[]): ReportLine[] {
  const { plan, otherBreaks } = scene;
  const twice = archive.duplicates.map(
    (name) => `The archive held "${name}" more than once; one copy is in this export.`,
  );
  const overlaps = plan.warnings.map((warning) => warning.message);
  return [
    ...grouped('archive entries were held more than once', twice),
    ...[...versionNote(scene.raisedFrom), ...integrityWarnings(scene.integrity, gdtfs)].map(line),
    ...some(otherBreaks, `${otherBreaks} ${OTHER_BREAKS}`).map(line),
    ...some(scene.unplaced, `${scene.unplaced} ${UNPLACED}`).map(line),
    ...grouped('patches overlap or may overlap', overlaps),
  ];
}

/**
 * Everything the export does not carry, could not judge or only notes, each with its count or names, so the user never
 * meets a silent loss in another program. A GDTF file the original did not hold either, a file id the desk could not
 * use and a kept address of unknown size are information: the export changed none of them. A GDTF file that only a
 * re-type on the desk made the file name is a warning (`integrityWarnings`): the export itself named a missing file.
 */
export function reportOf(
  scene: ScenePatch,
  archive: OriginalArchive,
  design: StageDesign,
  gdtfs: readonly string[],
): ExportReport {
  const { fileIdsKept, reserved } = scene;
  const fresh = new Set(freshGdtfs(scene.integrity, gdtfs));
  const old = gdtfs.filter((spec) => !fresh.has(spec));
  const information = [
    ...some(old.length, `GDTF files not in this export; get them from GDTF-Share: ${old.join(', ')}.`),
    ...some(fileIdsKept, `${fileIdsKept} ${FILE_IDS}`),
    ...some(
      reserved,
      `${reserved} kept addresses of other breaks or non-desk fixtures count as 1 channel in the overlap check.`,
    ),
  ];
  return {
    losses: losses(scene, archive, design),
    warnings: warnings(scene, archive, gdtfs),
    information: information.map(line),
  };
}
