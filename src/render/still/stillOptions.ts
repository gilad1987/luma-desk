import type { StillPreset } from './stopRule';
import type { TilePlan, TileRect } from './tilePlan';

export interface StillOptions {
  readonly width: number;
  readonly height: number;
  readonly quality: StillPreset | 'adaptive';
  /** A plan other than the default tiling of `width` x `height` (tests render a window across tile seams). */
  readonly plan?: TilePlan;
}

export function need<T>(value: T | null): T {
  if (value === null) throw new Error('a still step ran out of order');
  return value;
}

export function tileAt(plan: TilePlan, index: number): TileRect {
  const tile = plan.tiles[index];
  if (!tile) throw new Error(`the plan has no tile ${index}`);
  return tile;
}
