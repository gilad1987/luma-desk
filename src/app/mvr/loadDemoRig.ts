import { setMvrImportError } from '../../ui/panels/mvr/setMvrImportError';
import type { MvrFlowDeps } from './MvrFlowDeps';

/**
 * Leaves an imported stage for the built-in one and clears the import error. The stage follower (`followStage`)
 * drops the scenery and the prompt on this apply, as on every stage without MVR data. It is a step of the MVR load
 * queue, so a load that still runs cannot draw its scenery over the built-in stage. It cancels an open Stage Builder
 * first, as a show load does, so the builder's Cancel or Done cannot later overwrite the built-in stage. A starting
 * show becomes the built-in demo show again; the operator's cues are kept without the ids the built-in rig lacks.
 */
export function loadDemoRig(deps: MvrFlowDeps): Promise<void> {
  setMvrImportError('');
  deps.cancelBuilder();
  const before = deps.show.before();
  deps.stage.apply(deps.stage.builtIn, 'builder');
  deps.show.afterDemoRig(before);
  deps.modal().close();
  deps.toast('Demo rig loaded');
  return Promise.resolve();
}
