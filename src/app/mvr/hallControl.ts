import type { MvrGeometry } from '../../mvr';
import { setHallShell } from '../../render/venue/hall/hallShell';
import { showsFileHall } from '../../render/venue/hall/hallShellPlan';
import type { HallControl } from '../../ui/panels/mvr/hallRow';

/**
 * The "Desk hall" row of the layer list for the stage drawn from `geometry`. The rule of the row is the rule of the
 * render (`showsFileHall`), so the summary line states what is on screen. The choice is view state of the stage on
 * screen: a new stage starts with the hall shown, and nothing of it is saved or exported.
 */
export function hallControl(geometry: Pick<MvrGeometry, 'hallLayers'>): HallControl {
  let shown = true;
  setHallShell(shown);
  return {
    fileHall: (hidden) => showsFileHall(geometry.hallLayers, hidden),
    shown: () => shown,
    onChange: (next) => {
      shown = next;
      setHallShell(next);
    },
  };
}
