import { he } from '../../i18n/he';

/** Fixture-number range and type per rig-table row; the location column comes from the Hebrew copy, same order. */
const RIG_RANGES: readonly (readonly [range: string, type: string])[] = [
  ['101–120', 'Spot'],
  ['201–230', 'Beam'],
  ['301–330', 'Wash'],
  ['401–420', 'Spot'],
  ['501–530', 'Beam'],
  ['601–624', 'Wash'],
  ['701–740', 'Beam'],
  ['801–816', 'Blinder'],
  ['901–920', 'Strobe'],
  ['1001–1016', 'Wash'],
  ['1101–1120', 'LED Par'],
  ['1201–1224', 'Beam'],
  ['1301–1312', 'Wash'],
  ['1401–1424', 'Beam'],
  ['1501–1512', 'Spot'],
  ['1601–1610', 'Beam'],
  ['1701–1710', 'Wash'],
  ['1801–1812', 'Wash'],
  ['1813–1818', 'Wash'],
  ['1901–1904', 'Follow Spot'],
  ['2101–2112', 'LED Bar'],
  ['2201–2212', 'Profile'],
  ['2001', 'LED Screen'],
];

/** The body rows of the rig table in the "rig and groups" chapter. */
export function rigRowsMarkup(): string {
  return RIG_RANGES.map(
    ([range, type], i) => `<tr><td><code>${range}</code></td><td>${type}</td><td>${he.guide.rigLocations[i]}</td></tr>`,
  ).join('');
}

/** A group as the guide lists it: only the name and how many fixtures it holds. */
export interface GuideGroup {
  readonly name: string;
  readonly ids: readonly number[];
}

/** The body rows of the default-groups table, keyed by group number in the order the record lists them. */
export function groupRowsMarkup(groups: Readonly<Record<string, GuideGroup>>): string {
  return Object.entries(groups)
    .map(
      ([n, g]) =>
        `<tr><td><code>Group ${n}</code></td><td>${g.name}</td><td style="color:var(--mut)">${he.guide.fixturesCount(g.ids.length)}</td></tr>`,
    )
    .join('');
}
