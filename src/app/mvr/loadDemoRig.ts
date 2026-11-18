import { setMvrImportError } from '../../ui/panels/mvr/setMvrImportError';
import type { MvrFlowDeps } from './MvrFlowDeps';

/**
 * Leaves an imported stage for the built-in one: no scenery, no prompt, no import error. It is a step of the MVR
 * load queue, so a load that still runs cannot draw its scenery over the built-in stage.
 */
export function loadDemoRig(deps: MvrFlowDeps): Promise<void> {
  deps.scenery.dispose();
  deps.prompt.hide();
  setMvrImportError('');
  deps.stage.apply(deps.stage.builtIn, 'builder');
  deps.modal().close();
  deps.toast('Demo rig loaded');
  return Promise.resolve();
}
