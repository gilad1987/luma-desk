import { DECK, SCREEN } from '../venue';
import type { RigBuilder } from './RigBuilder';

/** The fixtures standing on the deck (floor beams, floor washes, screen pars) and the LED screen itself. */
export function addDeckFixtures(rig: RigBuilder): void {
  rig.row(701, 40, 'beam', -21, 21, DECK + 0.32, -18, 'floor');
  rig.row(1001, 16, 'wash', -19, 19, DECK + 0.32, -0.3, 'floor');
  rig.row(1101, 20, 'par', -16.5, 16.5, DECK + 0.22, -19.7, 'floor', { pan: 0, tilt: -12 });
  rig.add(2001, 'screen', 0, (SCREEN.y0 + SCREEN.y1) / 2, SCREEN.z, 'wall');
}
