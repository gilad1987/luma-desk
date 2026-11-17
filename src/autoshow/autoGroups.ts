import type { Rig } from '../domain/rig';

/** The fixture id lists the auto-show lights as units, each a block of the rig's id plan. */
export interface AutoGroups {
  readonly audW: readonly number[];
  readonly towB: readonly number[];
  readonly towW: readonly number[];
  readonly ring: readonly number[];
  readonly rwash: readonly number[];
  readonly angB: readonly number[];
  readonly angS: readonly number[];
  readonly foh: readonly number[];
  readonly t2: readonly number[];
  readonly t3: readonly number[];
  readonly t4: readonly number[];
  readonly back: readonly number[];
  readonly tow: readonly number[];
  readonly floor: readonly number[];
  readonly fwash: readonly number[];
  readonly pars: readonly number[];
  readonly blind: readonly number[];
  readonly strobe: readonly number[];
  readonly bars: readonly number[];
  readonly follow: readonly number[];
  readonly prof: readonly number[];
}

/**
 * Builds the auto-show groups from the rig once. Each list is a separate array kept for the life of the generator:
 * the look builder tells the ring and the angled-truss beams apart by array identity, not by content.
 */
export function buildAutoGroups(rig: Rig): AutoGroups {
  return {
    audW: rig.range(1801, 1899),
    towB: rig.range(1601, 1699),
    towW: rig.range(1701, 1799),
    ring: rig.range(1201, 1299),
    rwash: rig.range(1301, 1399),
    angB: rig.range(1401, 1499),
    angS: rig.range(1501, 1599),
    foh: rig.range(101, 199),
    t2: rig.range(201, 299),
    t3: rig.range(301, 399),
    t4: rig.range(401, 499),
    back: rig.range(501, 599),
    tow: rig.range(601, 699),
    floor: rig.range(701, 799),
    fwash: rig.range(1001, 1099),
    pars: rig.range(1101, 1199),
    blind: rig.range(801, 899),
    strobe: rig.range(901, 999),
    bars: rig.range(2101, 2199),
    follow: rig.range(1901, 1999),
    prof: rig.range(2201, 2299),
  };
}
