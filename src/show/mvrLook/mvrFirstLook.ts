import type { Fixture } from '../../domain/Fixture';
import type { FixtureTypeId } from '../../domain/FixtureType';
import { aimAt } from '../../domain/aim';
import type { Cue } from '../../engine/CueList';
import { colorByName } from '../../engine/colorByName';
import { buildCueVals, type CueValueStep } from '../../engine/cueValues';
import type { RigSource } from '../../engine/stage/RigSource';
import { colorByPlaceOf } from './colorByPlace';
import { levelSteps } from './lookLevels';
import { lookTargetOf } from './lookTarget';

/** The name of the first-look cue and of the executor that holds it; a re-import finds its own look by this name. */
export const MVR_FIRST_LOOK_NAME = 'MVR First Look';

/**
 * The types that take part in the look. Blinders, strobes and follow spots stay dark (on they would wash out or flash
 * the stage, and a follow spot has an operator); an LED screen keeps its own content.
 */
const LOOK_TYPES: ReadonlySet<FixtureTypeId> = new Set(['spot', 'beam', 'wash', 'par', 'bar', 'profile']);

/** The moving types whose narrow beams in haze carry the look; other moving types fill colour under them. */
const KEY_TYPES: ReadonlySet<FixtureTypeId> = new Set(['spot', 'beam', 'profile']);

/** Key beams at full on a small rig: they are narrow, so a few dozen of them leave the haze between them dark. */
const KEY_DIM = 100;
/** Moving washes at 40 %: they colour the stage under the beams, but their cones do not fog the haze. */
const WASH_DIM = 40;
/** Static pars, bars and washes at 15 %: a coloured glow on the set that keeps the background dark. */
const GLOW_DIM = 15;

/** Key colours: magenta, blue and white by place, so white falls on about one third of the key beams only. */
const KEY_COLORS = ['Magenta', 'Blue', 'White'].map(colorByName);
/** Fill colours: saturated magenta and blue only, because white washes and pars turn the whole haze white. */
const FILL_COLORS = ['Magenta', 'Blue'].map(colorByName);

/** Fade-in time in seconds when the operator replays the cue; the import itself starts it at once. */
const LOOK_FADE_S = 2;

/** The narrowest zoom of the fixture's type, so each moving beam reads as a distinct shaft and not as a cone of fog. */
const narrowest = (f: Fixture) => ({ zoom: f.T.zr[0] });

const idsOf = (fixtures: readonly Fixture[]): number[] => fixtures.map((f) => f.id);

/**
 * The first look an MVR import plays, designed like a rock look on a dark stage: the moving spots, beams and profiles
 * at full with the narrowest zoom, the moving washes at a moderate level, the static units as a low glow, and the
 * blinders and strobes off. On a big rig each group shares a light budget (`levelSteps`), so the stage, band and set
 * stay readable from 10 to 500 fixtures. Every mover is fanned at a point on the design's own deck (`lookTargetOf`),
 * mirrored, so the left and right fans cross over the stage and front-of-house units light the stage. Colours mirror
 * left and right (`colorByPlaceOf`). It uses only desk attributes and colours, so the operator edits it like any cue.
 * Returns null for a rig without a look fixture. Pure: the same stage always gives the same cue.
 */
export function buildMvrFirstLook(source: Pick<RigSource, 'rig' | 'frame'>): Cue | null {
  const look = source.rig.fixtures.filter((f) => LOOK_TYPES.has(f.type));
  if (look.length === 0) return null;
  const aimed = look.filter((f) => f.T.moving);
  const key = aimed.filter((f) => KEY_TYPES.has(f.type));
  const fill = look.filter((f) => !key.includes(f));
  const washes = aimed.filter((f) => !key.includes(f));
  const statics = look.filter((f) => !f.T.moving);
  const target = lookTargetOf(source.frame);
  const steps: CueValueStep[] = [
    ...levelSteps(key, KEY_DIM),
    ...levelSteps(washes, WASH_DIM),
    ...levelSteps(statics, GLOW_DIM),
    [idsOf(key), colorByPlaceOf(key, KEY_COLORS)],
    [idsOf(fill), colorByPlaceOf(fill, FILL_COLORS)],
    [idsOf(aimed), narrowest],
    [idsOf(aimed), (f) => aimAt(f, ...target(f))],
  ];
  const vals = buildCueVals(source.rig, steps);
  return { num: 1, name: MVR_FIRST_LOOK_NAME, fade: LOOK_FADE_S, vals, fx: [] };
}
