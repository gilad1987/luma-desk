import type { FixtureRole } from '../../types';

/**
 * The truss of the fixture at index `i` of a range (`i = id - from`), or null for a fixture that stands on no truss.
 * A function covers ranges that run over several trusses of one kind.
 */
type TrussOf = string | null | ((i: number) => string);

interface RoleRange {
  readonly from: number;
  readonly to: number;
  readonly role: FixtureRole;
  readonly truss: TrussOf;
}

/** Angled beams alternate between the front and the back angled truss of a side; 12 per side, left side first. */
const angledBeamTruss = (i: number): string => `angled-${(i < 12 ? 0 : 3) + (i % 2 ? 3 : 1)}`;

const RANGES: readonly RoleRange[] = [
  { from: 101, to: 120, role: 'front', truss: 'front' },
  { from: 801, to: 816, role: 'blinder', truss: 'front' },
  { from: 1801, to: 1812, role: 'front', truss: 'front' },
  { from: 1813, to: 1818, role: 'front', truss: (i) => `delay-${i < 3 ? 1 : 2}` },
  { from: 1901, to: 1904, role: 'follow', truss: 'front' },
  { from: 201, to: 230, role: 'mid', truss: 't2' },
  { from: 301, to: 330, role: 'mid', truss: 't3' },
  { from: 901, to: 920, role: 'strobe', truss: 't3' },
  { from: 401, to: 420, role: 'mid', truss: 't4' },
  { from: 501, to: 530, role: 'back', truss: 'back' },
  { from: 601, to: 624, role: 'side', truss: (i) => `ladder-${Math.floor(i / 4) + 1}` },
  { from: 2201, to: 2212, role: 'profile', truss: (i) => `ladder-${Math.floor(i / 2) + 1}` },
  { from: 701, to: 740, role: 'floor', truss: null },
  { from: 1001, to: 1016, role: 'floor', truss: null },
  { from: 1101, to: 1120, role: 'floor', truss: null },
  { from: 1601, to: 1610, role: 'floor', truss: (i) => `tower-${i + 1}` },
  { from: 1701, to: 1710, role: 'floor', truss: (i) => `tower-${i + 1}` },
  { from: 1201, to: 1224, role: 'ring', truss: 'ring-outer' },
  { from: 1301, to: 1312, role: 'ring', truss: 'ring-inner' },
  { from: 1401, to: 1424, role: 'angled', truss: angledBeamTruss },
  { from: 1501, to: 1512, role: 'angled', truss: (i) => `angled-${i < 6 ? 2 : 5}` },
  { from: 2001, to: 2001, role: 'screen', truss: null },
  { from: 2101, to: 2112, role: 'footlight', truss: null },
];

/** The role and the parent truss of one Sultan's Pool fixture. */
export interface FixturePlace {
  readonly role: FixtureRole;
  readonly trussId: string | null;
}

/**
 * The role and truss of a Sultan's Pool fixture, from the id-range table of the plan. It throws on an id outside the
 * table, so a fixture added to the rig without a role fails the template instead of landing in no group.
 */
export function placeOf(id: number): FixturePlace {
  const range = RANGES.find((r) => id >= r.from && id <= r.to);
  if (!range) throw new Error(`Sultan's Pool template: fixture ${id} is not in the role table`);
  const trussId = typeof range.truss === 'function' ? range.truss(id - range.from) : range.truss;
  return { role: range.role, trussId };
}
