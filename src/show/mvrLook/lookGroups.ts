import type { Fixture } from '../../domain/Fixture';
import { mirrorOrder, type LookArea } from './lookArea';
import { systemOf, type RigSystem } from './rigSystems';

/**
 * The fixtures of a rig by their job in the first look. `key` lights the band from the front and `frontFixed` are
 * the front units that cannot be aimed; `follow` are the
 * follow spots; `tone` are the overhead washes that colour the deck; `cross` are the side washes; `fans`, `towers`
 * and `ups` are the aerial beams from overhead, from the sides and from the floor; `bars` and `blinders` glow;
 * `statics` are the other fixed units. Strobes and LED screens are in no group.
 */
export interface LookGroups {
  readonly key: readonly Fixture[];
  readonly frontFixed: readonly Fixture[];
  readonly follow: readonly Fixture[];
  readonly tone: readonly Fixture[];
  readonly cross: readonly Fixture[];
  readonly fans: readonly Fixture[];
  readonly towers: readonly Fixture[];
  readonly ups: readonly Fixture[];
  readonly bars: readonly Fixture[];
  readonly blinders: readonly Fixture[];
  readonly statics: readonly Fixture[];
}

/** Metres of depth that count as one truss row when the downstage row has to stand in for missing front light. */
const ROW_DEPTH_M = 1;

const isMover = (f: Fixture): boolean => f.T.moving && f.has('pan');
/** Spots and beams draw shafts in haze; a beam is too narrow to light a face, so it is never key light. */
const isAerial = (f: Fixture): boolean => isMover(f) && (f.type === 'spot' || f.type === 'beam');
const isWash = (f: Fixture): boolean => isMover(f) && f.type === 'wash';
const isFixed = (f: Fixture): boolean => f.type === 'par' || f.type === 'profile';

/** The downstage row of `pool`: what a designer focuses on the band when the plot has no front position. */
function downstageRow(pool: readonly Fixture[]): readonly Fixture[] {
  const edge = Math.max(...pool.map((f) => f.pos.z));
  return pool.filter((f) => f.pos.z >= edge - ROW_DEPTH_M);
}

/**
 * A rig of one spot row only must key the band and still draw beams: the first, third, ... unit from each end key,
 * the units between them stay aerial. Counted from the ends, so the split mirrors about the centre line.
 */
function everyOther(row: readonly Fixture[], cx: number): readonly Fixture[] {
  const ranked = mirrorOrder(row, cx);
  return ranked.filter((_, i) => Math.min(i, ranked.length - 1 - i) % 2 === 0);
}

/**
 * Splits a rig into the groups of the first look. Key light comes first: when no front unit can light the band, the
 * downstage row of the overhead washes (or of the overhead spots when there is no wash) becomes key, because a band
 * that does not read spoils every other choice. Pure and deterministic; every fixture is in one group at most.
 */
export function lookGroupsOf(area: LookArea, fixtures: readonly Fixture[]): LookGroups {
  const system = systemOf(area, fixtures);
  const of = (s: RigSystem, pick: (f: Fixture) => boolean): Fixture[] =>
    fixtures.filter((f) => system(f) === s && pick(f));
  const front = of('front', (f) => f.type !== 'beam' && isMover(f));
  const washes = of('overhead', isWash);
  const spots = of('overhead', isAerial);
  const pool = washes.length > 0 ? washes : spots.filter((f) => f.type === 'spot');
  const row = front.length > 0 || pool.length === 0 ? [] : downstageRow(pool);
  const towers = [...of('side', isAerial), ...of('front', (f) => isMover(f) && f.type === 'beam')];
  const ups = of('floor', isMover);
  const isWholeRig = washes.length === 0 && row.length === spots.length && towers.length + ups.length === 0;
  const standIn = isWholeRig ? everyOther(row, area.cx) : row;
  return {
    key: [...front, ...standIn],
    frontFixed: of('front', isFixed),
    follow: of('follow', () => true),
    tone: washes.filter((f) => !standIn.includes(f)),
    cross: of('side', isWash),
    fans: spots.filter((f) => !standIn.includes(f)),
    towers,
    ups,
    bars: of('effect', (f) => f.type === 'bar'),
    blinders: of('effect', (f) => f.type === 'blinder'),
    statics: fixtures.filter((f) => isFixed(f) && system(f) !== 'front'),
  };
}
