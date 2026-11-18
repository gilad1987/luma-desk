import { he } from '../../i18n/he';
import type { MvrImport } from '../../mvr';
import type { ImportSummaryView } from '../../ui/panels/mvr/importSummaryView';
import type { LedWallsControl } from '../../ui/panels/mvr/ledWallsRow';
import { mayOpenMvrSummary } from '../../ui/panels/mvr/mayOpenMvrSummary';
import { openMvrSummary } from '../../ui/panels/mvr/openMvrSummary';
import type { LayerListParts } from './mvrLayerList';
import type { MvrFlowDeps } from './MvrFlowDeps';
import { bindLayerList } from './stageBoundList';

/** The parts of the summary the import works out before it opens: the lines, the LED control and the list parts. */
export interface SummaryParts {
  readonly view: ImportSummaryView;
  readonly ledWalls: LedWallsControl | undefined;
  readonly list: LayerListParts;
  /** True when the import kept the operator's cues: the summary then offers to build the starting show instead. */
  readonly kept: boolean;
}

/**
 * Opens the summary of `result` with its layer list, or, when another dialog holds the modal, toasts it in one line
 * so that dialog keeps its state. The toast path opens no list, so it names the layers that start hidden and says
 * where to show them: nothing of the file is hidden without a word.
 */
export function presentMvrSummary(result: MvrImport, parts: SummaryParts, deps: MvrFlowDeps): void {
  const { view, ledWalls, list, kept } = parts;
  const modal = deps.modal();
  const { layers = [], hiddenLayers = [] } = result.design.mvr ?? {};
  if (!mayOpenMvrSummary(modal)) {
    deps.toast(he.mvr.imported(result.design.source.name, result.summary.fixtureCount, view.warnings.length));
    const hidden = layers.filter((layer) => hiddenLayers.includes(layer.uuid)).map((layer) => layer.name);
    if (hidden.length > 0) deps.toast(he.mvr.layersHidden(hidden.join(', ')));
    if (kept) deps.toast(he.mvr.cuesKept);
    return;
  }
  const buildShow = kept ? deps.show.build : undefined;
  const { showProxies, audience, hall } = list;
  const content = { view, layers, hiddenLayers, buildShow, showProxies, audience, hall, ledWalls };
  const { hide, markLed, register } = bindLayerList(deps);
  register(openMvrSummary(modal, { ...content, markLed }, hide));
}
