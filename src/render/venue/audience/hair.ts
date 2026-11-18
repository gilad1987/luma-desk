import type { Station } from './limb';
import { MASK, type Corner, type P3 } from './loft';

/** The hair shapes: a low fringe, short, full over the ears, long to the shoulders, tied in a knot, under a cap. */
export type HairKind = 'bald' | 'short' | 'full' | 'long' | 'tied' | 'cap';

/** Per kind: the hairline at the front as a share of the head height, how much lower it runs at the sides, volume. */
const STYLE: Record<HairKind, readonly [line: number, sides: number, volume: number]> = {
  bald: [0, 0, 0],
  short: [0.78, 0, 0.04],
  full: [0.76, 0.12, 0.1],
  long: [0.76, 0.12, 0.12],
  tied: [0.78, 0.02, 0.05],
  cap: [0.78, 0.1, 0.03],
};
/** How far the hairline falls from the front to the back: to the nape, so a head seen from behind shows hair. */
const FALL = 0.95;
/** The level of a cap's edge, where its peak stands out over the brow. */
const CAP_EDGE = 0.74;

/** 0 at the front of a ring, 1 at its back. */
const back = (a: number): number => (1 - Math.cos(a)) / 2;

/** The hair, or the cap, at the corner `a` of the head level `t`; undefined where the face or the scalp shows. */
export function hairAt(kind: HairKind, t: number, a: number): Corner | undefined {
  const [line, sides, volume] = STYLE[kind];
  if (kind === 'bald') return t > 0.3 && t < 0.6 && back(a) > 0.7 ? [MASK.hair, 1.02] : undefined;
  // A cap takes the colour of the trousers, as the instance has no colour to spare for it.
  if (kind === 'cap' && t >= CAP_EDGE) {
    return [MASK.legs, 1.08 + (t === CAP_EDGE && Math.cos(a) > 0.8 ? 0.55 : 0), 0.85];
  }
  if (t <= line - FALL * back(a) ** 2 - sides * Math.sin(a) ** 2) return undefined;
  // Long hair is fuller low at the back, where it leaves the head.
  return [MASK.hair, 1 + volume + (kind === 'long' && t < 0.4 ? 0.1 : 0)];
}

/**
 * The hair that hangs off the head, as limb stations: long hair down to the shoulder blades, or the knot of tied
 * hair. `skull(t)` is the back of the skull at the head share `t`; a share below 0 is under the head.
 */
export function hairStations(kind: HairKind, skull: (t: number) => P3): Station[] | undefined {
  const hair = (t: number, behind: number, across: number, through: number): Station => {
    const [x, y, z] = skull(t);
    return { at: [x, y, z + behind], across, through, mask: MASK.hair };
  };
  if (kind === 'long')
    return [hair(0.5, -0.03, 0.07, 0.03), hair(0.05, 0, 0.075, 0.035), hair(-0.45, 0.04, 0.065, 0.022)];
  if (kind === 'tied')
    return [hair(0.56, -0.02, 0.022, 0.022), hair(0.5, 0.03, 0.042, 0.042), hair(0.42, 0.065, 0.018, 0.018)];
  return undefined;
}
