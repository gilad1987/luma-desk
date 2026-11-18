import type { Fixture } from '../../domain/Fixture';
import { LOOK_BALANCE, type LookBalance } from '../../domain/stage/showBalance';
import type { CueValueStep } from '../../engine/cueValues';
import type { KeyPlan } from './keyPlan';
import type { LookArea } from './lookArea';
import type { LookGroups } from './lookGroups';
import { groupLevel, levelSteps, LOOK_BUDGETS } from './lookLevels';
import { areaBudget, landedOutput, luminanceOf, poolArea } from './lookLight';
import type { LookPalette } from './lookPalette';

/** Under this level a key unit only greys the haze; the group then lights fewer units at this level. */
const KEY_MIN_LEVEL = 20;
/** The lowest tone level; every wash stays lit, because a dark wash is a hole in the colour of the deck. */
const TONE_MIN_LEVEL = 10;
/** A colour darker than this share of white is counted as this share, so no tone needs more than ten times white. */
const MIN_LUMINANCE = 0.1;
/** Back light a little over the level, the downstage washes a little under: depth, and less spill on the key. */
const UPSTAGE_GAIN = 1.15;
const DOWNSTAGE_GAIN = 0.85;

/** The colours of the look and what its key and tone must give; without a balance it is the one in use. */
export interface LookTone {
  readonly palette: LookPalette;
  readonly balance?: LookBalance | undefined;
}

const ids = (fixtures: readonly Fixture[]): number[] => fixtures.map((f) => f.id);

/** The dimmer steps of the tone washes: one level from the deck area and the colour, stronger upstage. */
function toneSteps(tone: readonly Fixture[], area: LookArea, palette: LookPalette, toneLux: number): CueValueStep[] {
  if (tone.length === 0) return [];
  const deck = 4 * area.halfWidth * area.halfDepth;
  const lux = toneLux / Math.max(luminanceOf(palette.primary), MIN_LUMINANCE);
  const output = (f: Fixture): number =>
    landedOutput(f.T.power, poolArea(Math.max(f.pos.y - area.floor, 1), f.T.zr[1]), deck);
  const need = { lux, area: deck, minLevel: TONE_MIN_LEVEL, all: true };
  const { level } = groupLevel(areaBudget(need, tone.map(output)), tone.length);
  const back = tone.filter((f) => f.pos.z < area.cz);
  const front = tone.filter((f) => !back.includes(f));
  return [
    [ids(back), { dim: Math.min(100, Math.round(level * UPSTAGE_GAIN)) }],
    [ids(front), { dim: Math.round(level * DOWNSTAGE_GAIN) }],
  ];
}

/**
 * The dimmer steps of the whole look, in the order of importance: key first (the band must read), then tone, then
 * the aerial beams and the glow. Key and tone take their level from the area they must light (`areaBudget`): a saturated
 * tone needs more level than a light one for the same brightness, so the colour's luminance divides the tone need.
 * The other groups share the fixed budgets of `LOOK_BUDGETS`. What key and tone must give is the `balance`
 * (`domain/stage/showBalance`), the one source of the stage balance.
 */
export function lookLevelSteps(groups: LookGroups, area: LookArea, key: KeyPlan, tone: LookTone): CueValueStep[] {
  const { cx } = area;
  const { palette, balance = LOOK_BALANCE } = tone;
  const keyNeed = { lux: balance.keyLux, area: key.bandArea, minLevel: KEY_MIN_LEVEL };
  return [
    ...levelSteps(groups.key, areaBudget(keyNeed, groups.key.map(key.output)), cx),
    ...levelSteps(groups.frontFixed, LOOK_BUDGETS.statics, cx),
    ...levelSteps(groups.follow, LOOK_BUDGETS.follow, cx),
    ...toneSteps(groups.tone, area, palette, balance.toneLux),
    ...levelSteps(groups.cross, LOOK_BUDGETS.cross, cx),
    ...levelSteps([...groups.fans, ...groups.towers, ...groups.ups], LOOK_BUDGETS.aerial, cx),
    ...levelSteps(groups.bars, LOOK_BUDGETS.bars, cx),
    ...levelSteps(groups.blinders, LOOK_BUDGETS.blinders, cx),
    ...levelSteps(groups.statics, LOOK_BUDGETS.statics, cx),
  ];
}
