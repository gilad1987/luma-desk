import type { MvrLayer } from '../../domain/stage/mvr';
import { he } from '../../i18n/he';
import type { MvrGeometry } from '../../mvr';
import { layerKeys } from '../../mvr/scene/layerKeys';
import type { MvrLayerListContent } from '../../ui/panels/mvr/layerList';
import { showLayersButton } from '../../ui/panels/mvr/layersButton';
import { mayOpenMvrLayers, openMvrLayers } from '../../ui/panels/mvr/openMvrLayers';
import { audienceControl } from './audienceControl';
import { hallControl } from './hallControl';
import { ledControlNow } from './ledSummary';
import type { MvrFlowDeps } from './MvrFlowDeps';
import { bindLayerList } from './stageBoundList';

/** The parts of the layer list that come from the drawn geometry; kept, so the import result itself can be freed. */
export type LayerListParts = Pick<MvrLayerListContent, 'showProxies' | 'audience' | 'hall'> & { shown: () => boolean };

/** The lazy loads of the layer list; a test passes one that fails. */
export interface LayerListLoads {
  readonly proxies: () => Promise<Pick<typeof import('../../render/mvr/proxies'), 'showProxies'>>;
  readonly ledNow: typeof ledControlNow;
}

const LOADS: LayerListLoads = { proxies: () => import('../../render/mvr/proxies'), ledNow: ledControlNow };

/** The detail of a "Show proxies" change whose module did not load. */
const SCENERY_MISSING = 'the scenery module did not load, so the proxies did not change';

/**
 * The "Show proxies" and audience controls of `geometry`, and whether the proxies are drawn now. `report` gets an
 * audience choice that could not be applied (`audienceControl`) and a "Show proxies" change that could not load.
 */
export function layerListParts(
  geometry: MvrGeometry,
  report: (error: unknown) => void,
  load: LayerListLoads['proxies'] = LOADS.proxies,
): LayerListParts {
  let shown = true;
  // The proxies module is part of the scenery chunk, which was fetched before this stage drew; a failed fetch is
  // reported and leaves `shown` as the proxies are drawn.
  const toggle = (next: boolean): void => {
    void load()
      .then((m) => {
        m.showProxies(next);
        shown = next;
      })
      .catch(() => report(new Error(SCENERY_MISSING)));
  };
  const showProxies = geometry.proxies?.some((proxy) => proxy.kind !== 'unknown') ? toggle : undefined;
  const audience = audienceControl(geometry.proxies, report);
  return { showProxies, audience, hall: hallControl(geometry), shown: () => shown };
}

/**
 * The layers of a design keyed as the scene walk keys a file (`layerKeys`): a show saved before the keys may list one
 * uuid for two layers, and the scenery draws the second under its own key. Keys already unique stay as they are.
 */
function keyedLayers(layers: readonly MvrLayer[]): MvrLayer[] {
  const keys = layerKeys(layers.map((layer) => layer.uuid));
  return layers.map((layer, index) => ({ ...layer, uuid: keys[index] ?? layer.uuid }));
}

/** Opens the layer list from the design the stage has now, so it shows the hidden and marked layers of this moment. */
async function openLayerList(deps: MvrFlowDeps, parts: LayerListParts, loads: LayerListLoads): Promise<void> {
  const { mvr, source } = deps.stage.design;
  if (!mvr) return;
  if (!mayOpenMvrLayers(deps.modal())) return deps.toast(he.mvr.layersBusy);
  // a failed LED load still opens the list, without the LED rows, and says why they are missing
  const ledWalls = await loads.ledNow(mvr.ledLayers ?? []).catch(() => {
    deps.toast(he.mvr.ledLayersFailed);
    return undefined;
  });
  // a stage change during the load wins: the list would bind this file's layers to the new stage
  if (deps.stage.design.source !== source) return;
  if (!mayOpenMvrLayers(deps.modal())) return deps.toast(he.mvr.layersBusy);
  const { hiddenLayers } = mvr;
  const { showProxies, audience, hall, shown } = parts;
  const layers = keyedLayers(mvr.layers);
  const content = { layers, hiddenLayers, showProxies, proxiesShown: shown(), audience, hall, ledWalls };
  const { hide, markLed, register } = bindLayerList(deps);
  register(openMvrLayers(deps.modal(), { ...content, markLed }, hide));
}

/**
 * Puts "Layers" in the top bar for the MVR stage now drawn from `geometry`, after an import and after a restore. The
 * button opens the layer list at any time: the import summary opens once, and not at all when another dialog held
 * the modal or after a reload. It returns the parts, which the import summary shows too.
 */
export function offerLayerList(deps: MvrFlowDeps, geometry: MvrGeometry, loads = LOADS): LayerListParts {
  const failed = (error: unknown): void =>
    deps.toast(he.mvr.layerControlFailed(error instanceof Error ? error.message : String(error)));
  const parts = layerListParts(geometry, failed, loads.proxies);
  showLayersButton(() => void openLayerList(deps, parts, loads));
  return parts;
}

/** Takes "Layers" out of the top bar: the stage is no longer an MVR file. */
export function hideLayerList(): void {
  showLayersButton(undefined);
}
