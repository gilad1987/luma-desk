import { setMvrImportError } from '../../ui/panels/mvr/setMvrImportError';
import type { MvrFlowDeps } from './MvrFlowDeps';

/**
 * Leaves an imported stage for the built-in one and clears the import error. The stage follower (`followStage`)
 * drops the scenery and the prompt on this apply, as on every stage without MVR data. It is a step of the MVR load
 * queue, so a load that still runs cannot draw its scenery over the built-in stage. It cancels an open Stage Builder
 * first, as a show load does, so the builder's Cancel or Done cannot later overwrite the built-in stage.
 */
export function loadDemoRig(deps: MvrFlowDeps): Promise<void> {
  setMvrImportError('');
  deps.cancelBuilder();
  deps.stage.apply(deps.stage.builtIn, 'builder');
  deps.modal().close();
  deps.toast('Demo rig loaded');
  return Promise.resolve();
}
