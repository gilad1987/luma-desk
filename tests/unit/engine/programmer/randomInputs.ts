import { ATTR, type AttrName, type Feature } from '../../../../src/domain/attributes';
import type { PresetType } from '../../../../src/engine/presetTypes';
import { PHASER_TYPES, type PhaserType } from '../../../../src/engine/shared';
import type { Worlds } from './worlds';

export type Rand = () => number;

export const pick = <T>(r: Rand, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;

export const ATTRS = Object.keys(ATTR) as AttrName[];
export const FEATURES: readonly Feature[] = ['dim', 'pos', 'gobo', 'color', 'beam'];
export const PHASERS = Object.keys(PHASER_TYPES) as PhaserType[];
export const POOLS: readonly PresetType[] = [1, 2, 3, 4, 5];
export const MODES = ['replace', 'add', 'sub', 'toggle'] as const;

/** Values that hit the clamp ends, the two-decimal rounding edges and the gobo step. */
const VALUES = [-10, -0, 0, 0.004, 0.005, 0.125, 1.005, 2.5, 33.333, 50.5, 99.996, 100, 150, 255, 360, 1e9, -1e9, 7.5];

export const randomValue = (r: Rand): number => (r() < 0.6 ? pick(r, VALUES) : r() * 400 - 50);

/** One fixture, a run in build order (like a group) or a scatter with unknown ids and duplicates. */
export function randomIds(r: Rand, w: Worlds): number[] {
  const all = w.engine.rig.fixtures;
  if (r() < 0.15) return [pick(r, all).id];
  if (r() < 0.45) {
    const start = Math.floor(r() * all.length);
    return all.slice(start, start + 1 + Math.floor(r() * 16)).map((f) => f.id);
  }
  const ids = Array.from({ length: Math.floor(r() * 8) }, () => pick(r, all).id);
  if (r() < 0.2) ids.push(9999);
  const first = ids[0];
  if (r() < 0.2 && first !== undefined) ids.push(first);
  return ids;
}

/** Store options the callers pass today: none, a fade (command line), merge (sequence click), a name. */
export function randomStoreOptions(r: Rand): { name?: string; fade?: number; merge?: boolean } {
  const opts: { name?: string; fade?: number; merge?: boolean } = {};
  if (r() < 0.4) opts.fade = pick(r, [0, 1.5, 3, 2]);
  if (r() < 0.3) opts.merge = r() < 0.7;
  if (r() < 0.2) opts.name = pick(r, ['', 'Look']);
  return opts;
}
