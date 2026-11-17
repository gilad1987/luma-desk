import type { Feature } from '../../domain/attributes';
import type { FxRef, PhaserFeature } from '../shared';

/** The phaser that wins one feature of one fixture, and the level that scales its dimmer output. */
export interface PhaserSlot {
  readonly r: FxRef;
  readonly lv: number;
}

/**
 * The winning phaser per feature while one fixture is merged; null means none, or a programmer value cleared it. Any
 * feature may be cleared, but only the {@link PHASER_FEATURES} ever hold a phaser.
 */
export type PhaserSlots = Partial<Record<Feature, PhaserSlot | null>>;

/** The features phasers drive, in the order the merge applies them. */
export const PHASER_FEATURES: readonly PhaserFeature[] = ['pos', 'dim', 'color'];

/** Empty slots for the next fixture. */
export function emptySlots(): PhaserSlots {
  return { pos: null, dim: null, color: null };
}
