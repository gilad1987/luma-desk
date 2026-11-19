import type { FigureSpec } from './FigureSpec';
import { hairAt } from './hair';
import { MASK, type Corner, type P3, type Ring } from './loft';
import { SEATED } from './proportions';
import { hipSlide, REFERENCE, SPINE } from './trunk';

/** Head levels: share of the head height, half width, half depth, shift to the front; metres. */
const LEVELS = [
  [0, 0.022, 0.03, 0.058],
  [0.1, 0.057, 0.074, 0.046],
  [0.2, 0.065, 0.084, 0.042],
  [0.36, 0.071, 0.091, 0.039],
  [0.5, 0.075, 0.096, 0.035],
  [0.6, 0.077, 0.099, 0.033],
  [0.74, 0.076, 0.097, 0.031],
  [0.9, 0.062, 0.08, 0.029],
  [1, 0.03, 0.04, 0.028],
] as const;
/** The levels that carry the face: mouth, nose tip with the ear lobes, eyes with the ears, brow. */
const [MOUTH, NOSE, EYES, BROW] = [0.2, 0.36, 0.5, 0.6];
/**
 * The height of the head from chin to crown, and of the chin over the seat for the reference stature: the sitting
 * height of `SEATED` (0.91 m) less the head, 0.675 m. The head was 8.5 cm lower, on shoulders 11 cm too low.
 */
const HEAD_HEIGHT = 0.235;
export const HEAD_BASE = SEATED.sittingHeight * REFERENCE - HEAD_HEIGHT;

/** True for the corner `degrees` off the front of the head, on either side. */
const off = (a: number, degrees: number): boolean => Math.abs(Math.cos(a) - Math.cos((degrees * Math.PI) / 180)) < 0.01;

/**
 * The face at one corner: a nose wedge from the brow to its tip, eye sockets set in and dark under a brow ridge, a
 * dark mouth line, ears as bumps at the sides, and the underside of the jaw in shade.
 */
function face(t: number, a: number): Corner {
  // Which corner this is: 0 the front, 1 beside it, 2 the ear, and the last value of a list for any other.
  const corner = [0, 30, 90].findIndex((degrees) => off(a, degrees));
  const at = (values: readonly [number, number, number, number]): number => values[corner] ?? values[3];
  if (t === MOUTH) return [MASK.skin, 1, at([0.55, 0.7, 1, 1])];
  if (t === NOSE) return [MASK.skin, at([1.2, 1, 1.1, 1])];
  if (t === EYES) return [MASK.skin, at([1.06, 0.94, 1.13, 1]), at([1, 0.45, 1, 1])];
  if (t === BROW) return [MASK.skin, at([1.04, 1.04, 1, 1]), at([1, 0.8, 1, 1])];
  return [MASK.skin, 1, t < 0.15 ? 0.85 : 1];
}

/** The measures of a head: the height of its base over the seat, its own height, and the depth of its axis. */
function measures(spec: FigureSpec): { readonly y: number; readonly tall: number; readonly z: number } {
  const k = spec.stature / REFERENCE;
  const y = HEAD_BASE * k;
  // A head grows less than a body: half of the stature difference. It stays upright on a leaning back.
  return { y, tall: HEAD_HEIGHT * (0.5 + 0.5 * k), z: -SPINE - hipSlide(spec) - spec.lean * y };
}

/** The point a head turns about: the top of the neck. */
export function headPivot(spec: FigureSpec): P3 {
  const { y, z } = measures(spec);
  return [0, y, z - 0.03];
}

/** The rings of the head from chin to crown, a part of its own, so it can have more sides than the torso. */
export function headRings(spec: FigureSpec): Ring[] {
  const { y, tall, z } = measures(spec);
  return LEVELS.map(([t, rx, rz, forward]) => ({
    c: [0, y + t * tall, z - forward],
    u: [0, 0, -rz * spec.head],
    v: [-rx * spec.head, 0, 0],
    surface: (a) => hairAt(spec.hair, t, a) ?? face(t, a),
  }));
}

/** The back of the skull at the head share `t`: where hair hangs from. */
export function skullBack(spec: FigureSpec): (t: number) => P3 {
  const { y, tall, z } = measures(spec);
  return (t) => [0, y + t * tall, z - 0.035 + 0.096 * spec.head];
}
