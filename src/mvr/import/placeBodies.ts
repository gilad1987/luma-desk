import type { StageDesign } from '../../domain/stage/StageDesign';
import { mountShift } from '../design/mountShift';

/**
 * The design with every fixture moved from its MVR insertion point (where it is clamped or stands) to the desk model
 * origin, the tilt axis, so a hung body hangs below its pipe and a floor body stands on the floor. The fit, the deck
 * and the roles use the insertion points, as the file states them. This step runs after the luma data because a desk
 * export holds no GDTF file: the import guesses a type and the luma data restores the real one, whose mount height
 * the shift needs; shifting before it would move a re-imported fixture by the guessed type's height.
 */
export function placeBodies(design: StageDesign): StageDesign {
  const fixtures = design.fixtures.map((fixture) => ({ ...fixture, position: mountShift(fixture, 'toBody') }));
  return { ...design, fixtures };
}
