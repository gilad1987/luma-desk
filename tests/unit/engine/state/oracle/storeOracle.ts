import type { AttrName, AttrValues, Feature } from '../../../../../src/domain/attributes';
import { FEAT_ATTRS } from '../../../../../src/domain/attributes';
import type { Fixture } from '../../../../../src/domain/Fixture';
import { PFN_ORACLE as PFN } from './positionsOracle';

// Reference oracles: the original PRESET_TYPES 1527, PT_FEAT 1528, presetVals 1569-1573 and storePreset 1870-1878
// from index.html at 48a3b63, formatted by Prettier. Changes: types; the globals (presets, sel, prog.vals, log) are
// parameters; renderPools/persist record the events that replace them.

type Preset = { name?: string; kind: string; vals?: AttrValues; fn?: string; fix?: Record<number, AttrValues> };
type Pools = Record<number, Record<number, Preset>>;

const PRESET_TYPES: Record<number, string> = { 1: 'Dimmer', 2: 'Position', 3: 'Gobo', 4: 'Color', 5: 'Beam' };
const PT_FEAT: Record<number, Feature[]> = { 1: ['dim'], 2: ['pos'], 3: ['gobo'], 4: ['color'], 5: ['beam'] };

export function presetValsOracle(pr: Preset, f: Fixture, k: number, n: number): AttrValues | undefined {
  if (pr.kind === 'global') return pr.vals;
  if (pr.kind === 'fn') return (PFN[pr.fn as string] as (typeof PFN)[string])(f, k, n);
  return pr.fix && pr.fix[f.id];
}

export function storePresetOracle(
  presets: Pools,
  sel: number[],
  vals: Record<number, AttrValues>,
  type: number,
  slot: number,
  calls: string[],
): void {
  const log = (text: string, level = '') => calls.push(`log:${level}:${text}`);
  const renderPools = () => calls.push('poolsChanged');
  const persist = () => calls.push('showChanged');
  const prog = { vals };
  const feats = PT_FEAT[type] as Feature[],
    fix: Record<number, AttrValues> = {};
  for (const id of sel) {
    const v = prog.vals[id];
    if (!v) continue;
    const o: AttrValues = {};
    for (const ft of feats) for (const a of FEAT_ATTRS[ft] as AttrName[]) if (v[a] != null) o[a] = v[a];
    if (Object.keys(o).length) fix[id] = o;
  }
  if (!Object.keys(fix).length) {
    log(`Store Preset: no ${PRESET_TYPES[type]} values in programmer for selection`, 'er');
    return;
  }
  const pool = presets[type] as Record<number, Preset>;
  pool[slot] = {
    name: pool[slot]?.name && pool[slot].kind === 'fix' ? pool[slot].name : `${PRESET_TYPES[type]} ${slot}`,
    kind: 'fix',
    fix,
  };
  log(`Stored Preset ${type}.${slot}`, 'ok');
  renderPools();
  persist();
}
