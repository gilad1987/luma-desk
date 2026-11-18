import type { Rig } from '../domain/rig';
import type { Group, GroupPool } from './GroupLibrary';

/**
 * The default groups that older saved shows do not have. They were appended as slots 35-37, so a show saved before
 * them may already use those slots for its own groups (quirk D5, orig:2303).
 */
export const NEW_GROUPS: readonly string[] = ['LED Bars', 'Follow Spots', 'Profiles'];

type GroupRow = [name: string, ids: number[]];

/** Slots 1-12: one group per truss or fixture position, in rig id ranges. */
function areaGroups(range: (from: number, to: number) => number[]): GroupRow[] {
  return [
    ['FOH Spots', range(101, 199)],
    ['Beams Truss 2', range(201, 299)],
    ['Washes Truss 3', range(301, 399)],
    ['Spots Truss 4', range(401, 499)],
    ['Back Beams', range(501, 599)],
    ['Tower Washes', range(601, 699)],
    ['Floor Beams', range(701, 799)],
    ['Floor Washes', range(1001, 1099)],
    ['Screen Pars', range(1101, 1199)],
    ['Blinders', range(801, 899)],
    ['Strobes', range(901, 999)],
    ['LED Screen', [2001]],
  ];
}

/** Slots 13-34: groups across areas, by type, side and odd/even. */
function combinedGroups(rig: Rig, range: (from: number, to: number) => number[]): GroupRow[] {
  const odd = (ids: number[]): number[] => ids.filter((_, i) => i % 2 === 0);
  const even = (ids: number[]): number[] => ids.filter((_, i) => i % 2 === 1);
  return [
    [
      'All Beams',
      [
        ...range(201, 299),
        ...range(501, 599),
        ...range(701, 799),
        ...range(1201, 1299),
        ...range(1401, 1499),
        ...range(1601, 1699),
      ],
    ],
    ['All Spots', rig.idsOfType('spot')],
    ['All Washes', rig.idsOfType('wash')],
    ['All Movers', rig.fixtures.filter((f) => f.T.moving).map((f) => f.id)],
    ['Floor Beams Odd', odd(range(701, 799))],
    ['Floor Beams Even', even(range(701, 799))],
    ['Beams T2 Left', range(201, 215)],
    ['Beams T2 Right', range(216, 230)],
    ['Towers Left', range(601, 612)],
    ['Towers Right', range(613, 624)],
    ['Everything', rig.lightIds()],
    ['Ring Beams', range(1201, 1299)],
    ['Ring Washes', range(1301, 1399)],
    ['Angled Beams', range(1401, 1499)],
    ['Angled Spots', range(1501, 1599)],
    ['Ring Odd', odd(range(1201, 1299))],
    ['Ring Even', even(range(1201, 1299))],
    ['All Angled', range(1401, 1599)],
    ['Tower Beams', range(1601, 1699)],
    ['Tower Washes', range(1701, 1799)],
    ['Audience Washes', range(1801, 1899)],
    ['Delay Towers', range(1813, 1818)],
  ];
}

/**
 * The factory group pool for a rig. Slot numbers are part of the show format (the demo show and saved shows refer to
 * groups by number), so groups are only ever appended, never reordered.
 */
export function defaultGroups(rig: Rig): GroupPool {
  const range = (from: number, to: number): number[] => rig.range(from, to);
  const groups: GroupRow[] = [
    ...areaGroups(range),
    ...combinedGroups(rig, range),
    // 35-37: append only, the demo show uses group numbers
    ['LED Bars', range(2101, 2199)],
    ['Follow Spots', range(1901, 1999)],
    ['Profiles', range(2201, 2299)],
  ];
  return Object.fromEntries(groups.map(([name, ids], i) => [i + 1, { name, ids }]));
}

/**
 * Upgrades a group pool from a show saved before `NEW_GROUPS` existed: each new default group is added at its default
 * slot, but only where that slot is still empty, so the show's own groups always win. Returns a new pool.
 */
export function addNewDefaultGroups(groups: GroupPool, defaults: GroupPool): GroupPool {
  const upgraded: Record<number, Group> = { ...groups };
  for (const [slot, group] of Object.entries(defaults)) {
    if (NEW_GROUPS.includes(group.name) && !upgraded[Number(slot)]) upgraded[Number(slot)] = group;
  }
  return upgraded;
}
