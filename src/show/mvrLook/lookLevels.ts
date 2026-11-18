import type { CueValueStep } from '../../engine/cueValues';
import type { Placed } from './lookArea';
import { mirrorGroups } from './mirrorGroups';

/**
 * The light budget of one group of the first look. Light adds up on the deck and in the haze, so a group runs at
 * `base` per cent up to `budget` units; a bigger group shares the budget and its level falls, down to `minShare` of
 * the base; past that point the group lights fewer units at that share and leaves the others off.
 */
export interface GroupBudget {
  readonly base: number;
  readonly budget: number;
  readonly minShare: number;
  /** Lights every unit, also past the budget: a dim wash or glow still colours, a dark unit is a hole in the row. */
  readonly all?: boolean;
}

/**
 * The fixed budgets. Key and tone are not here: their budget follows the area to light (`areaBudget`). Aerial shafts
 * stop at 30 lit units at 80 %: fewer, brighter shafts read in haze, more turn into fog. Side washes, bars and
 * fixed units are all lit and only fall in level: a dark unit among them is a hole in the picture.
 */
export const LOOK_BUDGETS = {
  follow: { base: 60, budget: 4, minShare: 0.5 },
  cross: { base: 50, budget: 12, minShare: 0.3, all: true },
  aerial: { base: 100, budget: 24, minShare: 0.8 },
  bars: { base: 12, budget: 48, minShare: 0.5, all: true },
  blinders: { base: 5, budget: 24, minShare: 0.6 },
  statics: { base: 25, budget: 24, minShare: 0.3, all: true },
} as const satisfies Record<string, GroupBudget>;

/** How a group of `count` units shares its budget: the level of a lit unit and how many units are lit. */
export interface GroupLevel {
  readonly level: number;
  readonly lit: number;
}

/**
 * The level and lit count of a group: full base up to the budget, then the level falls, then the lit count stops.
 * The level never passes 100 and at least one unit is lit.
 */
export function groupLevel(spec: GroupBudget, count: number): GroupLevel {
  const share = Math.max(spec.minShare, Math.min(1, spec.budget / Math.max(count, 1)));
  const lit = spec.all ? count : Math.min(count, Math.max(1, Math.round(spec.budget / share)));
  return { level: Math.min(100, Math.round(spec.base * share)), lit };
}

/**
 * The dimmer steps of one group: the lit units at the shared level, the others at 0. Units are lit in mirrored
 * pairs (`mirrorGroups`), evenly spaced from the ends of the rig to the centre line, so the picture is symmetric and
 * a very big rig shows light from every part of its width. The lit count is the nearest whole number of pairs and
 * single units. An empty group gives no step.
 */
export function levelSteps(fixtures: readonly Placed[], spec: GroupBudget, cx: number): CueValueStep[] {
  if (fixtures.length === 0) return [];
  const { level, lit } = groupLevel(spec, fixtures.length);
  const groups = mirrorGroups(fixtures, cx);
  const want = Math.max(1, Math.round((groups.length * lit) / fixtures.length));
  const picked = Array.from({ length: want }, (_, j) => groups[Math.floor(((j + 0.5) * groups.length) / want)] ?? []);
  const on = new Set(picked.flat().map((f) => f.id));
  const idsOf = (isOn: boolean): number[] => {
    const ids = fixtures.filter((f) => on.has(f.id) === isOn).map((f) => f.id);
    return ids.sort((a, b) => a - b);
  };
  return [
    [idsOf(true), { dim: level }],
    [idsOf(false), { dim: 0 }],
  ];
}
