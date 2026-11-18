import type { Fixture } from '../../domain/Fixture';
import type { FixtureTypeId } from '../../domain/FixtureType';
import type { Cue } from '../../engine/CueList';
import { colorByName, type NamedColor } from '../../engine/colorByName';
import { buildCueVals, type CueValueStep } from '../../engine/cueValues';
import { presetFnsOf } from '../../engine/stage/presetFnsOf';
import type { RigSource } from '../../engine/stage/RigSource';

/** The name of the first-look cue and of the executor that holds it; a re-import finds its own look by this name. */
export const MVR_FIRST_LOOK_NAME = 'MVR First Look';

/**
 * The types that take part in the look. Blinders, strobes and follow spots stay dark (at full they would wash out or
 * flash the stage, and a follow spot has an operator); an LED screen keeps its own content.
 */
const LOOK_TYPES: ReadonlySet<FixtureTypeId> = new Set(['spot', 'beam', 'wash', 'par', 'bar', 'profile']);

/** The types whose beam reads in haze, so only they are aimed; washes and bars keep their rigged angle. */
const AIMED_TYPES: ReadonlySet<FixtureTypeId> = new Set(['spot', 'beam']);

/** The look's colours, cycled over the mirrored places from the centre line outwards. */
const LOOK_COLORS: readonly NamedColor[] = ['Magenta', 'Blue', 'White'].map(colorByName);

/** Fade-in time in seconds when the operator replays the cue; the import itself starts it at once. */
const LOOK_FADE_S = 2;

/** The `k`-th colour of the cycle; `k` is a selection index, so it is never negative. */
function colorAt(k: number): NamedColor {
  const color = LOOK_COLORS[k % LOOK_COLORS.length];
  if (color === undefined) throw new RangeError(`MVR first look: no colour for index ${k}`);
  return color;
}

/** A fixture's place with its side dropped: a fixture and its mirror image on the other side share it. */
const mirroredPlace = (f: Fixture): string => `${Math.abs(f.pos.x)}|${f.pos.y}`;

/**
 * The colour of each mirrored place, cycling from the centre line outwards and, at one distance, from low to high.
 * It ranks places, not fixtures, so a fixture and its mirror image get the same colour even when one side holds more
 * fixtures than the other.
 */
function colorByPlace(fixtures: readonly Fixture[]): (f: Fixture) => NamedColor {
  const ordered = [...fixtures].sort((a, b) => Math.abs(a.pos.x) - Math.abs(b.pos.x) || a.pos.y - b.pos.y);
  const ranks = new Map<string, number>();
  for (const f of ordered) if (!ranks.has(mirroredPlace(f))) ranks.set(mirroredPlace(f), ranks.size);
  return (f) => colorAt(ranks.get(mirroredPlace(f)) ?? 0);
}

/**
 * The first look an MVR import plays, so the new rig is neither dark nor all pointing straight down: every look fixture
 * at full, a magenta / blue / white colour that mirrors left and right (`colorByPlace`), and the spots and beams on the
 * Cross preset, which aims each one at the mirrored point of the deck, so the left and right fans cross over the
 * stage. It uses only the desk's own presets and colours, so the operator edits or deletes it like any cue. Returns
 * null for a rig without a look fixture. Pure: the same stage always gives the same cue.
 */
export function buildMvrFirstLook(source: Pick<RigSource, 'rig' | 'frame'>): Cue | null {
  const look = source.rig.fixtures.filter((f) => LOOK_TYPES.has(f.type));
  if (look.length === 0) return null;
  const idsOf = (fixtures: readonly Fixture[]): number[] => fixtures.map((f) => f.id);
  const colorOf = colorByPlace(look);
  const aimed = look.filter((f) => f.T.moving && AIMED_TYPES.has(f.type));
  const steps: CueValueStep[] = [
    [idsOf(look), { dim: 100 }],
    [idsOf(look), (f) => ({ ...colorOf(f) })],
    [idsOf(aimed), presetFnsOf(source.frame).cross],
  ];
  const vals = buildCueVals(source.rig, steps);
  return { num: 1, name: MVR_FIRST_LOOK_NAME, fade: LOOK_FADE_S, vals, fx: [] };
}
