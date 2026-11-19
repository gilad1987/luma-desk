import type { Fixture } from '../../../domain/Fixture';
import type { CueValueStep } from '../../../engine/cueValues';

/**
 * Light adds up: every mover aims at the same few points on the deck (`lookTargetOf`) and the haze between the fans
 * takes the sum of every beam through it, so a level that reads on a club rig turns a big rig's stage and haze white.
 * Each group of the look therefore has a budget of this many units at its base level; a bigger group shares it.
 * The festival template (72 key spots and beams, 48 moving washes and bars) so starts at 33, 20 and 15 for static
 * fill; a theatre-size rig keeps 100, 40 and 15.
 */
export const LOOK_BUDGET = 24;

/**
 * Below this share of its base level a beam no longer reads as a shaft in haze; past that point the group lights
 * fewer units at this share rather than more units at less.
 */
export const MIN_SHARE = 0.25;

/** How a group of `count` units at base level `base` shares the budget: the level and how many of them are lit. */
export interface GroupLevel {
  readonly level: number;
  readonly lit: number;
}

/** The level and lit count of a group: full base up to the budget, then the level falls, then the lit count stops. */
export function groupLevel(base: number, count: number): GroupLevel {
  const share = Math.max(MIN_SHARE, Math.min(1, LOOK_BUDGET / count));
  return { level: Math.round(base * share), lit: Math.min(count, Math.round(LOOK_BUDGET / share)) };
}

type Placed = Pick<Fixture, 'id' | 'pos'>;
/** Left to right, then front to back, then by id, so the same rig always gives the same order. */
const byPlace = (a: Placed, b: Placed): number => a.pos.x - b.pos.x || a.pos.z - b.pos.z || a.id - b.id;

/**
 * The dimmer steps of one group: `lit` units spread evenly across the rig's width at the shared level, the others at
 * 0, so a very big rig still shows beams from every truss and the sum stays on the budget.
 */
export function levelSteps(fixtures: readonly Placed[], base: number): CueValueStep[] {
  const { level, lit } = groupLevel(base, fixtures.length);
  const sorted = [...fixtures].sort(byPlace);
  const picked = new Set(Array.from({ length: lit }, (_, i) => sorted[Math.floor(((i + 0.5) * sorted.length) / lit)]));
  const on = sorted.filter((f) => picked.has(f)).map((f) => f.id);
  const off = sorted.filter((f) => !picked.has(f)).map((f) => f.id);
  return [
    [on, { dim: level }],
    [off, { dim: 0 }],
  ];
}
