import type { FixtureTypeId } from '../../../../../src/domain/FixtureType';
import type { Rig } from '../../../../../src/domain/rig';

// Reference oracle: the original defaultGroups 1538-1552 from index.html at 48a3b63, formatted by Prettier.
// Changes: types; the globals range, idsOfType and fixtures come from the rig parameter.

type Group = { name: string; ids: number[] };
export type Groups = Record<string, Group>;

export function defaultGroupsOracle(rig: Rig): Groups {
  const range = (a: number, b: number) => rig.range(a, b);
  const idsOfType = (t: FixtureTypeId) => rig.idsOfType(t);
  const fixtures = rig.fixtures;
  const g: Groups = {};
  let n = 1;
  const G = (name: string, ids: number[]) => (g[n++] = { name, ids });
  G('FOH Spots', range(101, 199));
  G('Beams Truss 2', range(201, 299));
  G('Washes Truss 3', range(301, 399));
  G('Spots Truss 4', range(401, 499));
  G('Back Beams', range(501, 599));
  G('Tower Washes', range(601, 699));
  G('Floor Beams', range(701, 799));
  G('Floor Washes', range(1001, 1099));
  G('Screen Pars', range(1101, 1199));
  G('Blinders', range(801, 899));
  G('Strobes', range(901, 999));
  G('LED Screen', [2001]);
  G('All Beams', [
    ...range(201, 299),
    ...range(501, 599),
    ...range(701, 799),
    ...range(1201, 1299),
    ...range(1401, 1499),
    ...range(1601, 1699),
  ]);
  G('All Spots', idsOfType('spot'));
  G('All Washes', idsOfType('wash'));
  G(
    'All Movers',
    fixtures.filter((f) => f.T.moving).map((f) => f.id),
  );
  G(
    'Floor Beams Odd',
    range(701, 799).filter((_, i) => i % 2 === 0),
  );
  G(
    'Floor Beams Even',
    range(701, 799).filter((_, i) => i % 2 === 1),
  );
  G('Beams T2 Left', range(201, 215));
  G('Beams T2 Right', range(216, 230));
  G('Towers Left', range(601, 612));
  G('Towers Right', range(613, 624));
  G(
    'Everything',
    fixtures.filter((f) => f.type !== 'screen').map((f) => f.id),
  );
  G('Ring Beams', range(1201, 1299));
  G('Ring Washes', range(1301, 1399));
  G('Angled Beams', range(1401, 1499));
  G('Angled Spots', range(1501, 1599));
  G(
    'Ring Odd',
    range(1201, 1299).filter((_, i) => i % 2 === 0),
  );
  G(
    'Ring Even',
    range(1201, 1299).filter((_, i) => i % 2 === 1),
  );
  G('All Angled', range(1401, 1599));
  G('Tower Beams', range(1601, 1699));
  G('Tower Washes', range(1701, 1799));
  G('Audience Washes', range(1801, 1899));
  G('Delay Towers', range(1813, 1818));
  G('LED Bars', range(2101, 2199));
  G('Follow Spots', range(1901, 1999));
  G('Profiles', range(2201, 2299)); // 35-37: append only, the demo show uses group numbers
  return g;
}
