import type { Fixture } from '../../domain/Fixture';
import type { CueValueStep } from '../../engine/cueValues';
import type { PresetFn } from '../../engine/positionPresets';
import { floorUpOf, towerCrossOf } from './crossPlan';
import { overheadFanOf, type FanEnd } from './fanPlan';
import { followZoomOf, leadPointOf, type KeyPlan } from './keyPlan';
import type { LookArea, LookPoint } from './lookArea';
import type { LookGroups } from './lookGroups';
import { colorByHeightOf, KEY_WHITE, OPEN_WHITE, TUNGSTEN_GLOW, type LookPalette } from './lookPalette';
import { reachAim } from './reach';
import { crossPointOf, tonePointOf } from './tonePlan';

/** The desk gobo "Breakup" (`GOBO_NAMES[2]`): texture in an aerial spot makes the shaft read as more than a tube. */
export const BREAKUP_GOBO = 2;

const ids = (fixtures: readonly Fixture[]): number[] => fixtures.map((f) => f.id);
/** Aims each fixture at its plan point through the reach solver, so every pose is in range for the real hang. */
const aim =
  (point: (f: Fixture) => LookPoint): PresetFn =>
  (f) =>
    reachAim(f, point(f));
/** The narrowest zoom of the type: an aerial beam reads as a shaft, not as a cone of fog. */
const narrow: PresetFn = (f) => ({ zoom: f.T.zr[0] });
/** The widest zoom of the type: a wash that tones the deck must not draw a pool. */
const wide: PresetFn = (f) => ({ zoom: f.T.zr[1] });

/**
 * The colour steps of the look: warm white key, open white follow spots, the palette's primary on the deck washes,
 * the fixed units and the floor beams, its accent on the side washes, the overhead fans and the LED bars, both
 * alternating up the towers, and a tungsten glow on the blinders. A unit with a gel (`Fixture.gel`, the colour its
 * MVR file assigns to a single-colour device) is in no step: it cannot change colour, so it keeps the gel's.
 */
export function colourSteps(groups: LookGroups, palette: LookPalette): CueValueStep[] {
  const free = (fixtures: readonly Fixture[]): number[] => ids(fixtures.filter((f) => f.gel === undefined));
  return [
    [free([...groups.key, ...groups.frontFixed]), KEY_WHITE],
    [free(groups.follow), OPEN_WHITE],
    [free([...groups.tone, ...groups.statics, ...groups.ups]), palette.primary],
    [free([...groups.cross, ...groups.fans, ...groups.bars]), palette.accent],
    [free(groups.towers), colorByHeightOf(groups.towers, palette)],
    [free(groups.blinders), TUNGSTEN_GLOW],
  ];
}

/**
 * The position, zoom and gobo steps of the look, one plan per group; `house` is how far the overhead fans run
 * (`houseRunOf`). Fixed units and tilt-only bars keep their
 * rigged aim: the cue builder drops the attributes a type does not have.
 */
export function aimSteps(groups: LookGroups, area: LookArea, key: KeyPlan, house: number | FanEnd): CueValueStep[] {
  const aerial = [...groups.fans, ...groups.towers, ...groups.ups];
  return [
    [ids(groups.key), aim(key.point)],
    [ids(groups.key), key.zoom],
    [ids(groups.follow), aim(() => leadPointOf(area))],
    [ids(groups.follow), followZoomOf(area)],
    [ids(groups.tone), aim(tonePointOf(area))],
    [ids(groups.cross), aim(crossPointOf(area))],
    [ids([...groups.tone, ...groups.cross]), wide],
    [ids(groups.fans), aim(overheadFanOf(area, groups.fans, house))],
    [ids(groups.towers), aim(towerCrossOf(area))],
    [ids(groups.ups), aim(floorUpOf(area, groups.ups))],
    [ids(aerial), narrow],
    [ids(aerial.filter((f) => f.type === 'spot')), { gobo: BREAKUP_GOBO }],
  ];
}
