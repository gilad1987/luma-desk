import { clamp, lerp } from '../core';
import { aimAt } from '../domain/aim';
import type { AttrValues } from '../domain/attributes';
import type { Fixture } from '../domain/Fixture';
import { deckAimOf } from './deckAim';
import { VENUE_AIM, type PresetAim } from './presetAim';
import { ringPresetsOf } from './ringPresets';

/**
 * A computed preset: the values for fixture `f`, the `k`-th of `n` fixtures it is applied to. Position presets aim
 * each fixture from where it hangs, and fans spread across the selection by index, so a stored value would not do.
 */
export type PresetFn = (f: Fixture, k: number, n: number) => AttrValues;

/** The fraction `k` of the way along `n` fixtures, or the middle for a single fixture. */
const fan = (k: number, n: number): number => (n > 1 ? k / (n - 1) : 0.5);

/** The entry for the `k`-th fixture, cycling through `list`; `k` is an index into the selection, never negative. */
function cycle<T>(list: readonly T[], k: number): T {
  const item = list[k % list.length];
  if (item === undefined) throw new RangeError(`preset index ${k} is not a selection index`);
  return item;
}

/**
 * The stage side (-1 left, 1 right) a fixture `x` built-in metres right of the deck centre aims to; fixtures on the
 * centre line alternate by index `k`.
 */
function stageSide(x: number, k: number): number {
  if (x < 0) return -1;
  if (x > 0) return 1;
  return k % 2 ? 1 : -1;
}

function positionsOf(aim: PresetAim) {
  const { deckY, screenZ, band, fit } = aim;
  const atDeck = deckAimOf(fit);
  return {
    ...ringPresetsOf(aim),
    converge: (f) => aimAt(f, 0, 12, 42),
    wingFan: (f) => aimAt(f, f.pos.x * 3.2, 3, f.pos.z + 55),
    home: () => ({ pan: 0, tilt: 0 }),
    straight: () => ({ pan: 0, tilt: 0 }),
    center: (f) => atDeck(f, (x, z) => [x * 0.6, deckY, -9 + (z + 9) * 0.25]),
    singer: (f) => atDeck(f, () => [0, deckY + 1.5, -3.2]),
    drums: (f) => atDeck(f, () => [0, deckY + 1.7, -13.2]),
    down: (f) => atDeck(f, (x) => [x * 0.55, deckY, -1.2]),
    audience: (f) => aimAt(f, clamp(f.pos.x * 1.6, -38, 38), 1.2, 30),
    fanAud: (f, k, n) => aimAt(f, lerp(-60, 60, fan(k, n)), 1, 42),
    crowd: (f, k, n) =>
      f.pos.z > 20
        ? aimAt(f, f.pos.x * 0.45, 1.2, cycle([18, 30, 46], k))
        : aimAt(f, lerp(-36, 36, fan(k, n)), 1.2, 14 + (k % 3) * 12),
    skyFan: (f, k, n) =>
      f.mount === 'floor'
        ? aimAt(f, lerp(-45, 45, fan(k, n)), 60, f.pos.z + 12)
        : aimAt(f, lerp(-60, 60, fan(k, n)), 30, 70),
    cross: (f) => atDeck(f, (x, z) => [-x * 0.9, deckY, z < -12 ? -5 : -9]),
    screen: (f) => aimAt(f, f.pos.x * 0.75, deckY + 5, screenZ),
    vOut: (f) =>
      f.mount === 'floor' ? aimAt(f, f.pos.x * 4, 40, f.pos.z) : aimAt(f, f.pos.x * 2.5, deckY, f.pos.z + 6),
    band: (f, k) => {
      const P = cycle(band, k);
      return aimAt(f, P[0], deckY + 1.3 + (P[2] || 0), P[1]);
    },
    orch: (f, k) => {
      const row = (k % 3) - 1;
      return atDeck(f, (x) => [stageSide(x, k) * (16.4 + row * 2.1), deckY + 1.6, -11.6 + row * 2.4]);
    },
    tunnel: (f) => aimAt(f, 0, f.mount === 'floor' ? 40 : deckY, 40),
  } satisfies Record<string, PresetFn>;
}

/** The name of a position preset, as the `fn` field of a saved preset holds it. */
export type PositionPresetName = keyof ReturnType<typeof positionsOf>;

/**
 * The position presets aimed at one stage, by function name; show files store the name. The deck height, the ring,
 * the screen plane and the band marks come from `aim`; the deck targets (center, singer, drums, down, cross, orch) are
 * built-in deck metres, read from the fixture's built-in place and moved onto the deck by `aim.fit` (`deckAimOf`).
 * The audience, sky and fixture-relative targets stay venue metres. On the built-in stage every number stays exact:
 * the demo show and the output goldens pin every degree.
 */
export function positionPresetsOf(aim: PresetAim): Readonly<Record<PositionPresetName, PresetFn>> {
  return positionsOf(aim);
}

/** The position presets of the built-in stage, typed as uniform functions so every caller passes (f, k, n). */
export const POSITION_PRESETS: Readonly<Record<PositionPresetName, PresetFn>> = positionPresetsOf(VENUE_AIM);
