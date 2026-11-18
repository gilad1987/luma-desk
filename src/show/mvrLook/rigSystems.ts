import type { Fixture } from '../../domain/Fixture';
import type { FixtureTypeId } from '../../domain/FixtureType';
import type { LookArea } from './lookArea';

/**
 * The lighting system a fixture belongs to, read from its type and place and never from its name: `front` is key
 * light, `overhead` is top and back light and aerial beams, `side` is towers and ladders, `floor` is up-beams,
 * `follow` has an operator, `effect` is LED bars, strobes and blinders, `none` takes no part (an LED screen, a device).
 */
export type RigSystem = 'front' | 'overhead' | 'side' | 'floor' | 'follow' | 'effect' | 'none';

/** The fixture fields the classifier reads. */
export type RigBody = Pick<Fixture, 'id' | 'pos' | 'type'>;

/** Effect units: they are looked at, they do not light the band, so they glow or stay dark in the first look. */
const EFFECT_TYPES: ReadonlySet<FixtureTypeId> = new Set(['bar', 'strobe', 'blinder']);
/** Units that give no light: an LED screen, and a device (a hoist, speaker or hazer from an MVR file). */
const DARK_TYPES: ReadonlySet<FixtureTypeId> = new Set(['screen', 'device']);
/** Metres above the floor under which a unit stands on the deck or on a flight case. */
const FLOOR_BAND_M = 1.2;
/** Metres upstage of the downstage edge from which a unit is front light: the front truss hangs over the lip. */
const FRONT_INSET_M = 0.5;
/** Metres downstage of the deck edge from which a unit stands in the house: front light, also on a tower. */
const HOUSE_MARGIN_M = 3;
/** Metres outside the deck's side edge from which a unit is a side position even without a stack under it. */
const SIDE_MARGIN_M = 0.3;
/** Two units this close in plan (metres) and this far apart in height are one above the other: a tower or ladder. */
const STACK_REACH_M = 0.8;
const STACK_STEP_M = 0.6;
/** Share of the half width from which a stack is a side tower; a stack nearer the centre is an upstage ladder. */
const STACK_SIDE = 0.5;

/** The ids of the fixtures that have another fixture above or below them. */
function stackedIds(fixtures: readonly RigBody[]): ReadonlySet<number> {
  const ids = new Set<number>();
  for (const a of fixtures)
    for (const b of fixtures) {
      if (a.id >= b.id || Math.abs(a.pos.y - b.pos.y) < STACK_STEP_M) continue;
      if (Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) > STACK_REACH_M) continue;
      ids.add(a.id).add(b.id);
    }
  return ids;
}

/**
 * The system of each fixture of a rig on `area`. Type decides follow spots, effects and screens; place decides the
 * rest, in this order: at floor height; outside the deck's sides or stacked on a side tower, unless it stands out in
 * the house; at or past the downstage edge; else overhead. Pure, and the same for a fixture and its mirror image about the centre line.
 */
export function systemOf(area: LookArea, fixtures: readonly RigBody[]): (f: RigBody) => RigSystem {
  // lights only: a hoist above a wash must not make that wash a tower unit
  const stacked = stackedIds(fixtures.filter((f) => !EFFECT_TYPES.has(f.type) && !DARK_TYPES.has(f.type)));
  const frontZ = area.cz + area.halfDepth;
  return (f) => {
    if (DARK_TYPES.has(f.type)) return 'none';
    if (f.type === 'follow') return 'follow';
    if (EFFECT_TYPES.has(f.type)) return 'effect';
    if (f.pos.y < area.floor + FLOOR_BAND_M) return 'floor';
    const side = Math.abs(f.pos.x - area.cx);
    const isTower = stacked.has(f.id) && side >= area.halfWidth * STACK_SIDE;
    const isOnStage = f.pos.z <= frontZ + HOUSE_MARGIN_M;
    if (isOnStage && (side > area.halfWidth + SIDE_MARGIN_M || isTower)) return 'side';
    return f.pos.z > frontZ - FRONT_INSET_M ? 'front' : 'overhead';
  };
}
