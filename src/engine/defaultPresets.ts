import { GOBO_NAMES } from '../domain/attributes';
import { COLORS } from './presetColors';
import type { PresetFnName } from './presetFunctions';
import type { Preset, PresetPools } from './presetTypes';

/** The default Position pool as [label, function name], in slot order. */
const POSITIONS: readonly (readonly [name: string, fn: PresetFnName])[] = [
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
];

/** Numbers a list into slots 1, 2, 3, ... */
const slots = (presets: readonly Preset[]): Record<number, Preset> =>
  Object.fromEntries(presets.map((preset, i) => [i + 1, preset]));

/**
 * The factory preset pools. Every show starts from them and a saved show's presets are laid over them, so slot
 * numbers and key order must stay as they are. Computed presets are rebuilt here because show files do not save them.
 */
export function defaultPresets(): PresetPools {
  const dimmers: [string, number][] = [
    ['Full', 100],
    ['75%', 75],
    ['50%', 50],
    ['25%', 25],
    ['Zero', 0],
  ];
  const gobos: Preset[] = GOBO_NAMES.map((name, i) => ({ name, kind: 'global', vals: { gobo: i }, gobo: i }));
  return {
    1: slots(dimmers.map(([name, dim]) => ({ name, kind: 'global', vals: { dim } }))),
    2: slots(POSITIONS.map(([name, fn]) => ({ name, kind: 'fn', fn }))),
    3: slots([
      ...gobos,
      { name: 'Rot Slow', kind: 'global', vals: { grot: 12 } },
      { name: 'Rot Fast', kind: 'global', vals: { grot: 55 } },
      { name: 'Rot Stop', kind: 'global', vals: { grot: 0 } },
    ]),
    4: slots(COLORS.map(([name, r, g, b]) => ({ name, kind: 'global', vals: { r, g, b } }))),
    5: slots([
      { name: 'Narrow', kind: 'fn', fn: 'zMin' },
      { name: 'Medium', kind: 'fn', fn: 'zMid' },
      { name: 'Wide', kind: 'fn', fn: 'zMax' },
      { name: 'Strobe Slow', kind: 'global', vals: { strobe: 25 } },
      { name: 'Strobe Fast', kind: 'global', vals: { strobe: 80 } },
      { name: 'Shutter Open', kind: 'global', vals: { strobe: 0 } },
    ]),
  };
}
