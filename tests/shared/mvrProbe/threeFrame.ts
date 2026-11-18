import type { JSHandle } from '@playwright/test';
import type { DeskTestApi } from '../deskApi';
import type { Affine, Vec3 } from './affine';

/** `__desk.test.mvrPlacements()` written out: the suite reads the app only through its API, never from src. */
export interface DrawnPlacements {
  offset: [number, number, number] | null;
  fixtures: {
    id: number;
    uuid: string | null;
    /** Rig position: the model origin after the mount shift, not the insertion point. */
    position: Vec3;
    rotation: [number, number, number, number] | null;
    /** How the body is drawn; absent on a build from before the field existed. */
    kind?: 'gdtf' | 'desk' | null;
    /**
     * The drawn body's mounting point, which the import puts on the MVR insertion point: the GDTF root geometry's
     * origin for a `gdtf` body, the top of the body box for a `desk` model.
     */
    clamp: Vec3 | null;
    /** The drawn group's world rotation. */
    bodyRotation: [number, number, number, number] | null;
  }[];
}

/** Reads the drawn placements; the shared `DeskTestApi` type leaves this accessor out, so this one place widens it. */
export function drawnPlacements(desk: JSHandle<DeskTestApi>): Promise<DrawnPlacements> {
  return desk.evaluate((d) => (d as DeskTestApi & { mvrPlacements(): DrawnPlacements }).mvrPlacements());
}

/**
 * MVR (mm, Z up) to the app's frame (m, Y up), written from the convention alone: (x, y, z) → (x, z, -y) / 1000.
 * Kept apart from src/mvr/math/axes.ts on purpose, so the gate does not trust the code it checks.
 */
export const toThree = ([x, y, z]: Vec3): Vec3 => [x / 1000, z / 1000, -y / 1000];

/**
 * The fixture's three axes in the app's frame. The body rotation is relative to the rest pose, which is MVR identity
 * (beam along MVR -Z, three -Y), so it is C·R·C⁻¹: its X, Y, Z columns are C·u, C·w and -C·v.
 */
export function axesInThree({ u, v, w }: Affine): [Vec3, Vec3, Vec3] {
  const c = (d: Vec3): Vec3 => [d[0], d[2], -d[1]];
  const negV = c(v).map((n) => -n);
  return [c(u), c(w), [negV[0] ?? 0, negV[1] ?? 0, negV[2] ?? 0]];
}

/** Vector `v` turned by unit quaternion `[x, y, z, w]`: v + 2w(q×v) + 2q×(q×v). */
export function turnByQuat([qx, qy, qz, qw]: readonly number[], v: Vec3): Vec3 {
  const [x = 0, y = 0, z = 0, w = 1] = [qx, qy, qz, qw];
  const t = [2 * (y * v[2] - z * v[1]), 2 * (z * v[0] - x * v[2]), 2 * (x * v[1] - y * v[0])] as const;
  return [
    v[0] + w * t[0] + (y * t[2] - z * t[1]),
    v[1] + w * t[1] + (z * t[0] - x * t[2]),
    v[2] + w * t[2] + (x * t[1] - y * t[0]),
  ];
}

/** Angle in degrees between two directions. */
export function angleDeg(a: Vec3, b: Vec3): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cos = dot / (Math.hypot(...a) * Math.hypot(...b));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
