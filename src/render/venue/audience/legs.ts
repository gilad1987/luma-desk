import type { FigureSpec } from './FigureSpec';
import { onSide, type Station } from './limb';
import { MASK, type P3 } from './loft';
import { hipSlide, REFERENCE, SPINE } from './trunk';

/** The proxy seat's top over the floor, metres: the feet stand this far under the figure's origin. */
export const SEAT_TOP = 0.45;
/** Half the distance between the hip joints. */
const HIP = 0.088;

/** The centre of the right knee: the buttock-to-knee length of the body, less the half depth of the knee itself. */
export function kneeOf(spec: FigureSpec): P3 {
  return [HIP + spec.knees, 0.035, -hipSlide(spec) - (0.59 * spec.stature) / REFERENCE + 0.07];
}

/**
 * The stations of one leg: the thigh on the seat, the knee past the seat edge, the lower leg down to a shoe on the
 * floor. The far level keeps hip, knee and a blunt end on the floor.
 */
export function legStations(spec: FigureSpec, side: 1 | -1, near: boolean): Station[] {
  const floor = -SEAT_TOP;
  const hipZ = -SPINE - hipSlide(spec);
  const [kx, kneeY, kneeZ] = kneeOf(spec);
  const az = kneeZ - 0.01 - spec.feet;
  const leg = (at: P3, across: number, through: number, mask: number = MASK.legs): Station =>
    onSide({ at, across, through, mask }, side);
  const hip = leg([HIP, 0.08, hipZ], 0.088, 0.08);
  const knee = leg([kx, kneeY, kneeZ], 0.056, 0.056);
  if (!near) return [hip, knee, leg([kx, floor + 0.01, az], 0.045, 0.05)];
  return [
    hip,
    leg([(HIP + kx) / 2, 0.078, (hipZ + kneeZ) / 2], 0.08, 0.073),
    leg([kx, 0.07, kneeZ + 0.08], 0.064, 0.062),
    knee,
    leg([kx, floor + 0.14, az + 0.02], 0.043, 0.047),
    leg([kx, floor + 0.11, az + 0.02], 0.037, 0.042, MASK.shoe),
    leg([kx, floor + 0.045, az - 0.03], 0.042, 0.04, MASK.shoe),
    leg([kx, floor + 0.026, az - 0.21], 0.045, 0.024, MASK.shoe),
  ];
}
