// The globals the original programmer functions read (index.base.html 1526-1536, 1836), passed in explicitly. The
// default presets are input data, proven equal to the original by the state suite; a copy keeps the worlds apart.
import type { Fixture } from '../../../../../src/domain/Fixture';
import { legacyEnv, type LegacyEnv } from '../../playback/oracle/legacyEnv';
import { jsonClone } from '../../../../../src/core';
import { defaultPresets } from '../../../../../src/engine/defaultPresets';
import { setSelOracle } from '../../state/oracle/selectionOracle';
import type { storePresetOracle } from '../../state/oracle/storeOracle';

/** The untyped preset pools, as the original stored them. */
export type Pools = Parameters<typeof storePresetOracle>[0];

/** The playback globals plus the ones the programmer code reads: FX, sel, presets and lastClear. */
export interface ProgEnv extends LegacyEnv {
  FX: Record<number, Fixture>;
  sel: number[];
  presets: Pools;
  lastClear: number;
}

export function progEnv(fixtures: readonly Fixture[]): ProgEnv {
  const FX = Object.fromEntries(fixtures.map((f) => [f.id, f]));
  return Object.assign(legacyEnv(fixtures), {
    FX,
    sel: [],
    presets: jsonClone(defaultPresets()),
    lastClear: 0,
  });
}

/** setSel 1795: the selection oracle, the `f.sel` mirror (env.selected) and the event that replaces `uiDirty.sel`. */
export function setSel(env: ProgEnv, ids: number[], mode = 'replace'): void {
  const s = { sel: env.sel };
  setSelOracle(s, env.FX, ids, mode);
  env.sel = s.sel;
  env.selected = new Set(env.sel);
  env.messages.push('selectionChanged');
}

export const log = (env: ProgEnv, t: string, c = ''): number => env.messages.push(c + ':' + t);
export const toast = (env: ProgEnv, t: string): number => env.messages.push('toast:' + t);
