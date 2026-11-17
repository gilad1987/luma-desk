import type { FixtureTypeId } from '../FixtureType';
import type { Rig } from '../rig/Rig';
import type { StageDesign, StageFixture } from './StageDesign';
import type { FixtureRole, TrussKind } from './types';

/**
 * One filter over the rig. Default groups and Auto Show groups use the same filters, so a new stage gets both from
 * its roles and trusses instead of from fixed id ranges. Every field narrows the result; `pick` runs last.
 */
export interface FixtureQuery {
  readonly role?: FixtureRole;
  readonly type?: FixtureTypeId;
  readonly moving?: boolean;
  /** Every fixture except the LED screen, as the old "all lights". */
  readonly lights?: true;
  /** `'none'` keeps fixtures that stand on no truss; a kind keeps fixtures on a truss of that kind. */
  readonly truss?: 'none' | TrussKind;
  /** Left is x < 0 and right is x > 0, seen from the audience; a fixture at x = 0 is on neither side. */
  readonly side?: 'left' | 'right';
  /** Keeps every second match: `odd` keeps indexes 0, 2, 4 (ids 701, 703 ... on the default rig). */
  readonly pick?: 'odd' | 'even';
}

/** A named group: the ids of its queries joined in query order, so a group keeps the old range order. */
export interface GroupRule {
  readonly name: string;
  readonly any: readonly FixtureQuery[];
}

function trussKindOf(d: StageDesign, f: StageFixture | undefined): 'none' | TrussKind | undefined {
  if (!f) return undefined;
  if (f.trussId === null) return 'none';
  return d.trusses.find((t) => t.id === f.trussId)?.params.kind;
}

/**
 * The ids that match `q`, in rig build order, because groups and the golden files depend on that order. Role and
 * truss come from the design; a rig fixture the design does not list matches no role or truss filter.
 */
export function selectIds(rig: Rig, d: StageDesign, q: FixtureQuery): number[] {
  const placed = new Map(d.fixtures.map((f) => [f.id, f]));
  const ids = rig.fixtures
    .filter((f) => q.type === undefined || f.type === q.type)
    .filter((f) => q.moving === undefined || f.T.moving === q.moving)
    .filter((f) => !q.lights || f.type !== 'screen')
    .filter((f) => q.side === undefined || (q.side === 'left' ? f.pos.x < 0 : f.pos.x > 0))
    .filter((f) => q.role === undefined || placed.get(f.id)?.role === q.role)
    .filter((f) => q.truss === undefined || trussKindOf(d, placed.get(f.id)) === q.truss)
    .map((f) => f.id);
  if (q.pick === undefined) return ids;
  const rest = q.pick === 'odd' ? 0 : 1;
  return ids.filter((_, i) => i % 2 === rest);
}

/** The ids of a rule: each query's ids in query order. Returns a new array on each call. */
export function selectRule(rig: Rig, d: StageDesign, rule: GroupRule): number[] {
  return rule.any.flatMap((q) => selectIds(rig, d, q));
}
