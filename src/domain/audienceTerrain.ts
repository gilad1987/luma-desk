import { Vector3 } from 'three';
import { clamp } from '../core';

/**
 * The audience bowl of Sultan's Pool, in metres: half width `X` of the pool floor, the z `Z1` where the terraces
 * start, the number of terrace `STEPS` with their `RISE` and `RUN`, and the retaining wall height `WH`. The venue
 * render builds the floor, terraces and crowd from it, and the fixture surface hits test the same terrace plane.
 */
export const VEN = { X: 42, Z1: 58, STEPS: 30, RISE: 0.55, RUN: 1.15, WH: 7 } as const;

/** The normal of the terrace slope; a beam that lands on the seats is lit along it. */
export const TIER_N: Readonly<Vector3> = new Vector3(0, 1, -VEN.RISE / VEN.RUN).normalize();

/**
 * The ground height at (x, z): the terrace slope inside the bowl, then hills with a little noise that climb outside
 * it (the Hinnom valley). The hill mesh, the Old City walls and the city lights all stand on it, so the arithmetic
 * and its operation order stay exactly as in the legacy script (float parity with the screenshot baselines).
 */
export function terrH(x: number, z: number): number {
  const zt = VEN.Z1 + VEN.STEPS * VEN.RUN,
    base = clamp(((z - VEN.Z1) / VEN.RUN) * VEN.RISE, 0, VEN.STEPS * VEN.RISE) + 4;
  const dx = Math.max(Math.abs(x) - VEN.X - 2, 0),
    dz = Math.max(z - zt, 0) + Math.max(-40 - z, 0) * 0.8,
    d = Math.hypot(dx, dz);
  if (d <= 0) return base;
  const nz =
    (Math.sin(x * 0.061) + Math.sin(z * 0.083 + 1.3) + Math.sin((x + z) * 0.047 + 2)) * 1.6 * Math.min(d / 12, 1);
  return base + Math.min(d * 0.55, 24) + (x < 0 ? Math.min(dx * 0.22, 12) : Math.min(dx * 0.16, 8)) + nz;
}
