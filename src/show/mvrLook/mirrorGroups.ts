import type { Placed } from './lookArea';

/** Metres from the centre line within which a unit is on it and has no partner. */
const CENTRE_M = 0.05;
/** Metres a unit may be off the mirror image of its partner: a real plot is not drawn to the centimetre. */
const PAIR_REACH_M = 0.5;

/**
 * The units as mirrored groups: a pair `[left, right]` for each left unit that has a unit within `PAIR_REACH_M` of
 * its mirror image about the centre line `cx`, and a group of one for a unit on the centre line or without a
 * partner. Left and right units that find no partner in reach (a plot whose sides differ in height or depth) are
 * then paired by rank from the ends, so the lit picture still balances. The groups run from the ends of the rig to
 * the centre line, upstage first at one distance. Pairing is by place first and not by rank, so one extra unit on a
 * side does not shift every pair after it.
 */
export function mirrorGroups<T extends Placed>(units: readonly T[], cx: number): T[][] {
  const reach = (f: T): number => Math.abs(f.pos.x - cx);
  const outerFirst = (a: T, b: T): number =>
    reach(b) - reach(a) || a.pos.z - b.pos.z || a.pos.y - b.pos.y || a.id - b.id;
  const free = new Set(units.filter((f) => f.pos.x > cx + CENTRE_M));
  const groups: { readonly lead: T; readonly units: T[] }[] = [];
  const lone: T[] = [];
  for (const left of units.filter((f) => f.pos.x < cx - CENTRE_M)) {
    let partner: T | undefined;
    let off = PAIR_REACH_M;
    for (const right of free) {
      const d = Math.hypot(right.pos.x + left.pos.x - 2 * cx, right.pos.y - left.pos.y, right.pos.z - left.pos.z);
      if (d < off) [partner, off] = [right, d];
    }
    if (partner) free.delete(partner);
    if (partner) groups.push({ lead: left, units: [left, partner] });
    else lone.push(left);
  }
  const rest = [...free].sort(outerFirst);
  lone.sort(outerFirst).forEach((left, i) => {
    const right = rest[i];
    groups.push({ lead: left, units: right ? [left, right] : [left] });
  });
  const single = [...rest.slice(lone.length), ...units.filter((f) => !(reach(f) > CENTRE_M))];
  for (const f of single) groups.push({ lead: f, units: [f] });
  groups.sort((a, b) => outerFirst(a.lead, b.lead));
  return groups.map((group) => group.units);
}
