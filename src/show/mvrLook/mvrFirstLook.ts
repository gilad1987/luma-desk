import type { LookBalance } from '../../domain/stage/showBalance';
import type { Cue } from '../../engine/CueList';
import { buildCueVals } from '../../engine/cueValues';
import type { RigSource } from '../../engine/stage/RigSource';
import { fanEndOf } from './fanEnd';
import { keyPlanOf } from './keyPlan';
import { lookAreaOf } from './lookArea';
import { lookGroupsOf } from './lookGroups';
import { lookLevelSteps } from './lookLevelSteps';
import { paletteOf } from './lookPalette';
import { aimSteps, colourSteps } from './lookSteps';

/** The name of the first-look cue and of the executor that holds it; a re-import finds its own look by this name. */
export const MVR_FIRST_LOOK_NAME = 'MVR First Look';

/** Fade-in time in seconds when the operator replays the cue; the import itself starts it at once. */
const LOOK_FADE_S = 2;

/**
 * The first look an MVR import plays, composed the way a designer builds a first state on an unknown rig. The rig is
 * split into systems by place and type (`lookGroupsOf`): front units key the band in warm white (`keyPlanOf`), follow
 * spots hold the lead position, overhead washes tone the deck in the palette's primary (stronger upstage), side
 * washes add the accent, and the spots and beams draw mirrored aerial fans (`fanPlan`). LED bars and blinders glow;
 * strobes stay off. Key and tone take their level from the area to light and the other groups share a light budget
 * (`lookLevelSteps`), so 10 fixtures are not dim and 500 are not white. It is static, uses only desk attributes, and
 * every pose passes the reach solver, so the operator edits it like any cue. Returns null for a rig without a fixture
 * the look uses. Pure: the same stage always gives the same cue. `balance` is the balance in use; the starting-show
 * rule passes an earlier one to know a look that an earlier version saved.
 */
export function buildMvrFirstLook(source: Pick<RigSource, 'rig' | 'frame'>, balance?: LookBalance): Cue | null {
  const { fixtures } = source.rig;
  const area = lookAreaOf(source.frame, fixtures);
  const groups = lookGroupsOf(area, fixtures);
  const palette = paletteOf(fixtures.length);
  const key = keyPlanOf(area, groups.key);
  const steps = [
    ...lookLevelSteps(groups, area, key, { palette, balance }),
    ...colourSteps(groups, palette),
    ...aimSteps(groups, area, key, fanEndOf(area, fixtures, source.frame.seats)),
  ];
  const vals = buildCueVals(source.rig, steps);
  if (Object.keys(vals).length === 0) return null;
  return { num: 1, name: MVR_FIRST_LOOK_NAME, fade: LOOK_FADE_S, vals, fx: [] };
}
