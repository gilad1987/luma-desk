import { he } from '../../i18n/he';
import type { LedWallsControl } from '../../ui/panels/mvr/ledWallsRow';
import { ledControlNow } from './ledSummary';
import type { MvrFlowDeps } from './MvrFlowDeps';

/**
 * Tells the scenery now built which layers draw as LED walls. The scenery stands behind a wrapper that passes on the
 * shown layers only, so the choice reaches it through its own module, as "Show proxies" does. That module is part of
 * the scenery chunk, which is loaded whenever an MVR stage is drawn; when it does not load, `report` tells the user
 * that the walls did not change.
 */
export function drawLedLayers(uuids: readonly string[], report?: (text: string) => void): void {
  void import('../../render/mvr/led/ledLayerLook')
    .then((look) => look.setLedLayers(uuids))
    .catch(() => report?.(he.mvr.ledLayersFailed));
}

/**
 * Marks the MVR layers with these uuids as LED walls: the design keeps the list (saved with the show, no rig rebuild,
 * as for hidden layers) and the scenery draws their meshes as LED surfaces. It resolves with the LED controls the
 * stage has afterwards: the top bar shows the LED level from the first mark on, also for a file that gives no LED
 * evidence of its own, and hides it again with the last mark of such a file. A design without MVR data has no layers
 * to mark. It never rejects: a failure is toasted and resolves with no controls.
 */
export function markLedLayers(
  { stage, toast }: Pick<MvrFlowDeps, 'stage' | 'toast'>,
  ledLayers: readonly string[],
): Promise<LedWallsControl | undefined> {
  const { design } = stage;
  if (!design.mvr) return Promise.resolve(undefined);
  stage.updateMeta({ ...design, mvr: { ...design.mvr, ledLayers } });
  drawLedLayers(ledLayers, toast);
  return ledControlNow(ledLayers).catch(() => {
    toast(he.mvr.ledLayersFailed);
    return undefined;
  });
}
