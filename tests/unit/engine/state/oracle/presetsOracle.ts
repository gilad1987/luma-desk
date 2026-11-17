import { GOBO_NAMES } from '../../../../../src/domain/attributes';

// Reference oracle: the original COLORS 1553-1554 and defaultPresets 1555-1567 from index.html at 48a3b63,
// formatted by Prettier. Changes: types only.

type Pools = Record<1 | 2 | 3 | 4 | 5, Record<number, unknown>>;

export const COLORS_ORACLE: [string, number, number, number][] = [
  ['White', 100, 100, 100],
  ['Warm', 100, 80, 55],
  ['CTO', 100, 58, 22],
  ['Red', 100, 0, 0],
  ['Orange', 100, 32, 0],
  ['Amber', 100, 52, 0],
  ['Yellow', 100, 88, 0],
  ['Lime', 55, 100, 0],
  ['Green', 0, 100, 8],
  ['Cyan', 0, 100, 100],
  ['Lt Blue', 25, 65, 100],
  ['Blue', 0, 12, 100],
  ['Congo', 28, 0, 100],
  ['Lavender', 62, 40, 100],
  ['Magenta', 100, 0, 100],
  ['Pink', 100, 22, 55],
];
const COLORS = COLORS_ORACLE;
export function defaultPresetsOracle(): Pools {
  const p: Pools = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
  (
    [
      ['Full', 100],
      ['75%', 75],
      ['50%', 50],
      ['25%', 25],
      ['Zero', 0],
    ] as [string, number][]
  ).forEach(([n, v], i) => (p[1][i + 1] = { name: n, kind: 'global', vals: { dim: v } }));
  [
    ['Home', 'home'],
    ['Center', 'center'],
    ['Singer', 'singer'],
    ['Drums', 'drums'],
    ['Downstage', 'down'],
    ['Band', 'band'],
    ['Orchestra', 'orch'],
    ['Cross', 'cross'],
    ['Audience', 'audience'],
    ['Fan Audience', 'fanAud'],
    ['Sky Fan', 'skyFan'],
    ['V Out', 'vOut'],
    ['Screen', 'screen'],
    ['Tunnel', 'tunnel'],
    ['Straight', 'straight'],
    ['Ring Down', 'ringDown'],
    ['Ring Cone', 'ringCone'],
    ['Ring Sunburst', 'ringSun'],
    ['Ring Twist', 'ringTwist'],
    ['Ring Crown', 'ringCrown'],
    ['Converge', 'converge'],
    ['Wing Fan', 'wingFan'],
    ['Crowd', 'crowd'],
  ].forEach(([n, fn], i) => (p[2][i + 1] = { name: n, kind: 'fn', fn }));
  GOBO_NAMES.forEach((n, i) => (p[3][i + 1] = { name: n, kind: 'global', vals: { gobo: i }, gobo: i }));
  p[3][9] = { name: 'Rot Slow', kind: 'global', vals: { grot: 12 } };
  p[3][10] = { name: 'Rot Fast', kind: 'global', vals: { grot: 55 } };
  p[3][11] = { name: 'Rot Stop', kind: 'global', vals: { grot: 0 } };
  COLORS.forEach(([n, r, g, b], i) => (p[4][i + 1] = { name: n, kind: 'global', vals: { r, g, b } }));
  p[5][1] = { name: 'Narrow', kind: 'fn', fn: 'zMin' };
  p[5][2] = { name: 'Medium', kind: 'fn', fn: 'zMid' };
  p[5][3] = { name: 'Wide', kind: 'fn', fn: 'zMax' };
  p[5][4] = { name: 'Strobe Slow', kind: 'global', vals: { strobe: 25 } };
  p[5][5] = { name: 'Strobe Fast', kind: 'global', vals: { strobe: 80 } };
  p[5][6] = { name: 'Shutter Open', kind: 'global', vals: { strobe: 0 } };
  return p;
}
