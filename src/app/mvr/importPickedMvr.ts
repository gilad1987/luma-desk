import { he } from '../../i18n/he';
import { importMvrFile } from '../../ui/panels/mvr/importMvrFile';
import { importSummaryView } from '../../ui/panels/mvr/importSummaryView';
import { openMvrSummary } from '../../ui/panels/mvr/openMvrSummary';
import { setMvrImportError } from '../../ui/panels/mvr/setMvrImportError';
import type { MvrFlowDeps } from './MvrFlowDeps';

/**
 * Hides the MVR layers with these uuids: the design keeps the list (saved with the show, no rig rebuild, G8) and the
 * scenery hides them. A design without MVR data has no layers, so there is nothing to hide.
 */
function hideLayers({ stage, scenery }: MvrFlowDeps, hiddenLayers: readonly string[]): void {
  const { design } = stage;
  if (!design.mvr) return;
  stage.updateMeta({ ...design, mvr: { ...design.mvr, hiddenLayers } });
  scenery.setHiddenLayers(hiddenLayers);
}

/**
 * Imports a picked `.mvr` file: store and apply it (`importMvrFile`), draw its scenery, then open the summary with
 * the mesh files three.js could not draw. A file that is not a usable MVR keeps the stage, toasts and fills
 * `#mvrImportError`. The import result is not kept after the summary, so its mesh bytes can be freed.
 */
export async function importPickedMvr(file: File, deps: MvrFlowDeps): Promise<void> {
  setMvrImportError('');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const outcome = await importMvrFile({ name: file.name, bytes }, deps);
  if (outcome.kind === 'failed') {
    deps.toast(outcome.message);
    setMvrImportError(outcome.message);
    return;
  }
  deps.prompt.hide();
  const { result } = outcome;
  const failures = await deps.scenery.show(result);
  const { layers = [], hiddenLayers = [] } = result.design.mvr ?? {};
  const content = { view: importSummaryView(result, failures), layers, hiddenLayers };
  openMvrSummary(deps.modal(), content, (uuids) => hideLayers(deps, uuids));
  if (!outcome.stored) deps.toast(he.mvr.notStored);
}
