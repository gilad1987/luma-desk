import { he } from '../../i18n/he';
import { importMvrFile } from '../../ui/panels/mvr/importMvrFile';
import { importSummaryView } from '../../ui/panels/mvr/importSummaryView';
import { setMvrImportError } from '../../ui/panels/mvr/setMvrImportError';
import { withBodyLines } from './bodyNoteLines';
import { ledWallsControl } from './ledSummary';
import type { MvrFlowDeps } from './MvrFlowDeps';
import { offerLayerList } from './mvrLayerList';
import { presentMvrSummary } from './presentMvrSummary';
import { reportRejectedDesign } from './rejectedDesign';

/**
 * Imports a picked `.mvr` file: load the scenery chunk, measure the show, store and apply the file (`importMvrFile`),
 * build the starting show with the MVR first look or keep the operator's cues (`MvrShow.afterImport`), draw the
 * scenery, then show the summary with the mesh files three.js could not draw and, for kept cues, the choice to build
 * the starting show after all. The scenery chunk loads first, so a
 * chunk that does not load rejects before the stage changes. A file that is not a usable MVR keeps the stage, toasts
 * and fills `#mvrImportError`; so does a design the show loader rejected in the show step (`reportRejectedDesign`).
 * A stage change after the apply wins: before the draw the import then draws nothing, and during the draw it shows
 * no LED level, no "Layers" button and no summary, whose layer toggles would write this file's layers into the new
 * design. The import result is not kept after the summary, so its mesh bytes can be freed.
 */
export async function importPickedMvr(file: File, deps: MvrFlowDeps): Promise<void> {
  setMvrImportError('');
  await deps.scenery.load();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const before = deps.show.before();
  const outcome = await importMvrFile({ name: file.name, bytes }, deps);
  if (outcome.kind === 'failed') {
    deps.toast(outcome.message);
    setMvrImportError(outcome.message);
    return;
  }
  const current = (): boolean => deps.stage.design === outcome.result.design;
  if (!current()) return;
  deps.prompt.hide();
  const kept = deps.show.afterImport(before) === 'kept';
  // The show step is synchronous: a stage that changed in it was replaced by the show loader, not by the user.
  if (!current()) return reportRejectedDesign(outcome.result.design, deps);
  const bodies = deps.bodies.show(outcome.result);
  const failures = await deps.scenery.show(outcome.result);
  const result = withBodyLines(outcome.result, await bodies);
  const marked = result.design.mvr?.ledLayers ?? [];
  const ledWalls = await ledWallsControl(result.geometry, { fresh: true, marked, current });
  if (!current()) return;
  const list = offerLayerList(deps, result.geometry);
  presentMvrSummary(result, { view: importSummaryView(result, failures), ledWalls, list, kept }, deps);
  if (!outcome.stored) deps.toast(he.mvr.notStored);
}
