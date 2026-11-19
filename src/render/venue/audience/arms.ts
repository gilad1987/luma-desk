import type { ArmPose, FigureSpec } from './FigureSpec';
import { kneeOf } from './legs';
import { mix, onSide, type Station } from './limb';
import { MASK, type P3, type Ring } from './loft';
import { SEATED } from './proportions';
import { hipSlide, REFERENCE, SPINE } from './trunk';

/** How far under the shoulders the hands hold the phone, for the reference stature: in front of the chest. */
const PHONE_DROP = 0.24;

/** Half widths of an arm at the share `t` along it: 0 shoulder, 1 elbow, 1.6 wrist, 1.8 knuckles, 2 finger tips. */
const ARM = [
  [0, 0.05, 0.052],
  [0.45, 0.047, 0.05],
  [1, 0.04, 0.04],
  [1.6, 0.027, 0.021],
  [1.8, 0.04, 0.016],
  [2, 0.03, 0.011],
] as const;
/** Where the arm rings sit. Two rings close together end the sleeve in a sharp line, not in a colour fade. */
const NEAR = { long: [0, 0.45, 1, 1.58, 1.6, 1.8, 2], short: [0, 0.4, 0.42, 1, 1.6, 1.8, 2] } as const;
const FAR = [0, 1, 2] as const;
const SLEEVE = { long: 1.58, short: 0.4 } as const;
/** The thumb: the hand's corner toward the body stands out at the knuckles and is cut back at the finger tips. */
const THUMB: Readonly<Record<number, number>> = { 1.8: 1.5, 2: 0.55 };

function armWidths(t: number): readonly [number, number] {
  const next = Math.max(
    ARM.findIndex(([at]) => at >= t),
    1,
  );
  const [t0, a0, b0] = ARM[next - 1] ?? ARM[0];
  const [t1, a1, b1] = ARM[next] ?? ARM[5];
  const s = (t - t0) / (t1 - t0);
  return [a0 + (a1 - a0) * s, b0 + (b1 - b0) * s];
}

/** The right shoulder joint, at the acromion height of `SEATED`; the left one mirrors it. */
function shoulderOf(spec: FigureSpec): P3 {
  const y = SEATED.shoulderHeight * spec.stature;
  return [spec.shoulders / 2 - 0.048, y, -SPINE - 0.012 - hipSlide(spec) - spec.lean * y];
}

/** Elbow (x, y, z) and finger tips (x, y, z) of an arm, in right-side coordinates; a negative X crosses the body. */
type Joints = readonly [number, number, number, number, number, number];

/** The joints of one arm in the figure's pose. `rest` and `chin` are poses of the right arm only. */
function joints(spec: FigureSpec, right: boolean, [sx, sy, sz]: P3): Joints {
  const k = spec.stature / REFERENCE;
  const [kx, , kz] = kneeOf(spec);
  // The upper arm is 0.30 to 0.34 m of the reference body (shoulder to elbow), so the elbow of a hanging arm is at
  // the elbow rest height of a seated person. The hands lie on the thighs, the left one nearer the body, so the two
  // arms are not mirror images.
  const lap: Joints = [sx + 0.03, sy - 0.34 * k, sz - 0.07, 0.075, 0.158, sz - 0.07 - (right ? 0.31 : 0.25) * k];
  // An elbow on the armrest stays inside half a common seat pitch, so neighbours do not share an arm.
  const out = Math.min(sx + 0.05, 0.225);
  const poses: Record<ArmPose, Joints> = {
    lap,
    rest: [out, 0.215, sz + 0.05, out - 0.005, 0.215, sz + 0.05 - 0.4 * k],
    crossed: [sx + 0.04, sy - 0.3 * k, sz - 0.13, -0.09, sy - (right ? 0.22 : 0.26) * k, sz - 0.165],
    chin: [sx - 0.02, sy - 0.3 * k, sz - 0.15, 0.035, sy + 0.11 * k, sz - 0.1],
    phone: [sx + 0.03, sy - 0.31 * k, sz - 0.05, 0.04, sy - PHONE_DROP * k, sz - 0.36],
    forward: [kx, 0.2, kz + 0.2, 0.03, 0.1, kz - 0.22],
  };
  const oneArmed = spec.arms === 'rest' || spec.arms === 'chin';
  return oneArmed && !right ? lap : poses[spec.arms];
}

/** The stations of one arm: down from the shoulder to the elbow, then to the hand where the pose puts it. */
export function armStations(spec: FigureSpec, side: 1 | -1, near: boolean): Station[] {
  const shoulder = shoulderOf(spec);
  const [ex, ey, ez, hx, hy, hz] = joints(spec, side === 1, shoulder);
  return (near ? NEAR[spec.sleeves] : FAR).map((t) => {
    const at = t <= 1 ? mix(shoulder, [ex, ey, ez], t) : mix([ex, ey, ez], [hx, hy, hz], t - 1);
    const [across, through] = armWidths(t);
    const mask = t <= SLEEVE[spec.sleeves] ? MASK.top : MASK.skin;
    return onSide({ at, across, through, mask, inner: THUMB[t] }, side);
  });
}

/** The phone of the `phone` pose: a thin dark slab between the hands. It is unlit, like every part of a figure. */
export function phoneRings(spec: FigureSpec): Ring[] {
  const [, sy, sz] = shoulderOf(spec);
  const c = (z: number): P3 => [0, sy - (PHONE_DROP * spec.stature) / REFERENCE + 0.014, z];
  const slab = (z: number): Ring => ({ c: c(z), u: [-0.034, 0, 0], v: [0, 0.006, 0], surface: () => [MASK.shoe, 1] });
  return [slab(sz - 0.29), slab(sz - 0.4)];
}
