import type { Pose } from './performerSpec';

/** One arm's rotation about x and z, in radians. */
type ArmAngles = readonly [x: number, z: number];

/** The left and right arm angles of every pose. */
export const ARM_POSES: Readonly<Record<Pose, readonly [left: ArmAngles, right: ArmAngles]>> = {
  down: [
    [0, 0.08],
    [0, -0.08],
  ],
  guitar: [
    [-0.9, 0.5],
    [-1.1, -0.2],
  ],
  forward: [
    [-1.2, 0.15],
    [-1.2, -0.15],
  ],
  up: [
    [-1.6, 0.35],
    [-1.5, -0.3],
  ],
  violin: [
    [-1.4, -0.6],
    [-1, 0.7],
  ],
  cello: [
    [-0.7, 0.3],
    [-0.8, -0.45],
  ],
  mic: [
    [-1.3, 0.1],
    [0, -0.08],
  ],
};
