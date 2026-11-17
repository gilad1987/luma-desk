import type { Feature } from '../../domain/attributes';
import { PHASER_TYPES, type PhaserInstance } from './phaserTypes';

/** One fixture's place in a phaser: the instance, the fixture's position in its id list, and the list length. */
export interface FxRef {
  readonly inst: PhaserInstance;
  readonly idx: number;
  readonly n: number;
}

/**
 * The phaser that drives each fixture feature, keyed by {@link fxKey}. Executors, cue tracking and the programmer each
 * keep one, so the output merge finds a fixture's phaser with one lookup instead of scanning every instance.
 */
export type FxIndex = Record<string, FxRef>;

/** The {@link FxIndex} key of one fixture feature. Record keys arrive as strings, so the id may be either form. */
export function fxKey(id: number | string, feat: Feature): string {
  return `${id}|${feat}`;
}

/** Points every fixture of `inst` at it in `target`, replacing the phaser that drove the same feature before. */
export function indexFx(target: FxIndex, inst: PhaserInstance): void {
  const feat = PHASER_TYPES[inst.type].feat;
  inst.ids.forEach((id, idx) => {
    target[fxKey(id, feat)] = { inst, idx, n: inst.ids.length };
  });
}
