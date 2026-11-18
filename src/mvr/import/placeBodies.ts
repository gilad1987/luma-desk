import type { MvrDesignInfo } from '../../domain/stage/mvr';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { bodyShift } from '../design/bodyShift';

/**
 * The MVR facts with each fixture's GDTF size added, matched by fixture uuid; a fixture without a size is unchanged.
 */
function withBodySizes(mvr: MvrDesignInfo, sizes: ReadonlyMap<string, number>): MvrDesignInfo {
  const entries = Object.entries(mvr.fixtures).map(([id, info]) => {
    const bodySize = sizes.get(info.uuid);
    return [id, bodySize === undefined ? info : { ...info, bodySize }] as const;
  });
  return { ...mvr, fixtures: Object.fromEntries(entries) };
}

/**
 * The design with every fixture moved from its MVR insertion point (where it is clamped or stands) to the desk model
 * origin, the tilt axis, so a hung body hangs below its pipe and a floor body stands on the floor. The fit, the deck
 * and the roles use the insertion points, as the file states them. This step runs after the luma data because a desk
 * export holds no GDTF file: the import guesses a type and the luma data restores the real one, whose mount height
 * the shift needs; shifting before it would move a re-imported fixture by the guessed type's height. `bodySizes` is
 * the real size of each fixture by uuid, from its GDTF: it is stored first, because a body drawn smaller sits nearer
 * to its mounting point (`bodyShift`).
 */
export function placeBodies(design: StageDesign, bodySizes: ReadonlyMap<string, number> = new Map()): StageDesign {
  const mvr = design.mvr && bodySizes.size > 0 ? withBodySizes(design.mvr, bodySizes) : design.mvr;
  const fixtures = design.fixtures.map((fixture) => ({ ...fixture, position: bodyShift(fixture, mvr, 'toBody') }));
  return { ...design, fixtures, ...(mvr ? { mvr } : {}) };
}
