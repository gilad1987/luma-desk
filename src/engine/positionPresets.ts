import { clamp, lerp } from '../core';
import { aimAt } from '../domain/aim';
import type { AttrValues } from '../domain/attributes';
import type { Fixture } from '../domain/Fixture';
import { BAND_PTS, DECK, RING, SCREEN } from '../domain/venue';

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
  if (item === undefined) throw new RangeError(`preset index ${k} is not a selection index`); // quirk J3 (orig:846)
  return item;
}

/** The unit direction from the ring centre to a fixture in plan view, and its angle around the ring. */
function ringU(f: Fixture): [ux: number, uz: number, angle: number] {
  const dx = f.pos.x - RING.x,
    dz = f.pos.z - RING.z,
    l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l, Math.atan2(dx, dz)];
}

/** The stage side (-1 left, 1 right) a fixture at `x` aims to; fixtures on the centre line alternate by index `k`. */
function stageSide(x: number, k: number): number {
  if (x < 0) return -1;
  if (x > 0) return 1;
  return k % 2 ? 1 : -1;
}

/**
 * The position presets by function name; show files store the name. The aim targets are venue coordinates in metres
 * and must stay exactly as they are: the saved demo show and the output goldens depend on every rounded degree.
 */
const positions = {
  ringDown: (f) => (f.mount === 'floor' ? aimAt(f, f.pos.x, 40, f.pos.z) : aimAt(f, f.pos.x, DECK, f.pos.z)),
  ringCone: (f) => aimAt(f, RING.x, f.mount === 'floor' ? 34 : DECK, RING.z),
  ringSun: (f) => {
    const [ux, uz] = ringU(f);
    return aimAt(f, f.pos.x + ux * 40, f.pos.y - 5, f.pos.z + uz * 40);
  },
  ringTwist: (f) => {
    const [, , a] = ringU(f),
      b = a + 2.3;
    const y = f.mount === 'floor' ? 34 : DECK;
    return aimAt(f, RING.x + Math.sin(b) * RING.R * 0.9, y, RING.z + Math.cos(b) * RING.R * 0.9);
  },
  ringCrown: (f) => {
    const [ux, uz] = ringU(f);
    return aimAt(f, f.pos.x + ux * 22, 70, f.pos.z + uz * 22);
  },
  converge: (f) => aimAt(f, 0, 12, 42),
  wingFan: (f) => aimAt(f, f.pos.x * 3.2, 3, f.pos.z + 55),
  home: () => ({ pan: 0, tilt: 0 }),
  straight: () => ({ pan: 0, tilt: 0 }),
  center: (f) => aimAt(f, f.pos.x * 0.6, DECK, -9 + (f.pos.z + 9) * 0.25),
  singer: (f) => aimAt(f, 0, DECK + 1.5, -3.2),
  drums: (f) => aimAt(f, 0, DECK + 1.7, -13.2),
  down: (f) => aimAt(f, f.pos.x * 0.55, DECK, -1.2),
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
  cross: (f) => aimAt(f, -f.pos.x * 0.9, DECK, f.pos.z < -12 ? -5 : -9),
  screen: (f) => aimAt(f, f.pos.x * 0.75, DECK + 5, SCREEN.z),
  vOut: (f) => (f.mount === 'floor' ? aimAt(f, f.pos.x * 4, 40, f.pos.z) : aimAt(f, f.pos.x * 2.5, DECK, f.pos.z + 6)),
  band: (f, k) => {
    const P = cycle(BAND_PTS, k);
    return aimAt(f, P[0], DECK + 1.3 + (P[2] || 0), P[1]);
  },
  orch: (f, k) => {
    return aimAt(f, stageSide(f.pos.x, k) * (16.4 + ((k % 3) - 1) * 2.1), DECK + 1.6, -11.6 + ((k % 3) - 1) * 2.4);
  },
  tunnel: (f) => aimAt(f, 0, f.mount === 'floor' ? 40 : DECK, 40),
} satisfies Record<string, PresetFn>;

/** Typed as uniform functions so every caller passes (f, k, n), whichever arguments a preset happens to read. */
export const POSITION_PRESETS: Readonly<Record<keyof typeof positions, PresetFn>> = positions;
