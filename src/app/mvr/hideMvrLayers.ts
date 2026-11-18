import type { MvrFlowDeps } from './MvrFlowDeps';

/**
 * Hides the MVR layers with these uuids: the design keeps the list (saved with the show, no rig rebuild, G8) and the
 * scenery hides them. A design without MVR data has no layers, so there is nothing to hide.
 */
export function hideMvrLayers({ stage, scenery }: MvrFlowDeps, hiddenLayers: readonly string[]): void {
  const { design } = stage;
  if (!design.mvr) return;
  stage.updateMeta({ ...design, mvr: { ...design.mvr, hiddenLayers } });
  scenery.setHiddenLayers(hiddenLayers);
}
