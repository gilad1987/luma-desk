import { DECK, SCREEN } from '../venue';
import type { RigBuilder } from './RigBuilder';

/** The fixtures standing on the deck (floor beams, floor washes, screen pars) and the LED screen itself. */
export function addDeckFixtures(rig: RigBuilder): void {
  rig.row({ firstId: 701, count: 40, type: 'beam', x: [-21, 21], y: DECK + 0.32, z: -18, mount: 'floor' });
  rig.row({ firstId: 1001, count: 16, type: 'wash', x: [-19, 19], y: DECK + 0.32, z: -0.3, mount: 'floor' });
  rig.row({
    firstId: 1101,
    count: 20,
    type: 'par',
    x: [-16.5, 16.5],
    y: DECK + 0.22,
    z: -19.7,
    mount: 'floor',
    fixed: { pan: 0, tilt: -12 },
  });
  rig.add({ id: 2001, type: 'screen', at: [0, (SCREEN.y0 + SCREEN.y1) / 2, SCREEN.z], mount: 'wall' });
}
