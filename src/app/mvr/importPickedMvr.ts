import { he } from '../../i18n/he';
import type { MvrImport } from '../../mvr';
import type { MeshFailure } from '../../render/mvr/MeshLibrary';
import { importMvrFile } from '../../ui/panels/mvr/importMvrFile';
import { importSummaryView } from '../../ui/panels/mvr/importSummaryView';
import { mayOpenMvrSummary } from '../../ui/panels/mvr/mayOpenMvrSummary';
import { openMvrSummary } from '../../ui/panels/mvr/openMvrSummary';
import { setMvrImportError } from '../../ui/panels/mvr/setMvrImportError';
import { hideMvrLayers } from './hideMvrLayers';
import type { MvrFlowDeps } from './MvrFlowDeps';

/**
 * Opens the summary of `result` with its layer list, or, when another dialog holds the modal, toasts it in one line
 * so that dialog keeps its state.
 */
function presentSummary(result: MvrImport, failures: readonly MeshFailure[], deps: MvrFlowDeps): void {
  const view = importSummaryView(result, failures);
  const modal = deps.modal();
  if (!mayOpenMvrSummary(modal)) {
    deps.toast(he.mvr.imported(result.design.source.name, result.summary.fixtureCount, view.warnings.length));
    return;
  }
  const { layers = [], hiddenLayers = [] } = result.design.mvr ?? {};
  openMvrSummary(modal, { view, layers, hiddenLayers }, (uuids) => hideMvrLayers(deps, uuids));
}

/**
 * Imports a picked `.mvr` file: load the scenery chunk, store and apply the file (`importMvrFile`), play the MVR
 * first look, draw its scenery, then show the summary with the mesh files three.js could not draw. The scenery chunk loads first, so a
 * chunk that does not load rejects before the stage changes. A file that is not a usable MVR keeps the stage, toasts
 * and fills `#mvrImportError`. A stage change after the apply wins: before the draw the import then draws nothing,
 * and during the draw it opens no summary, whose layer toggles would write this file's layers into the new design.
 * The import result is not kept after the summary, so its mesh bytes can be freed.
 */
export async function importPickedMvr(file: File, deps: MvrFlowDeps): Promise<void> {
  setMvrImportError('');
  await deps.scenery.load();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const outcome = await importMvrFile({ name: file.name, bytes }, deps);
  if (outcome.kind === 'failed') {
    deps.toast(outcome.message);
    setMvrImportError(outcome.message);
    return;
  }
  if (deps.stage.design !== outcome.result.design) return;
  deps.prompt.hide();
  deps.applyFirstLook();
  const failures = await deps.scenery.show(outcome.result);
  if (deps.stage.design !== outcome.result.design) return;
  presentSummary(outcome.result, failures, deps);
  if (!outcome.stored) deps.toast(he.mvr.notStored);
}
