import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { clamp } from '../../../src/core';
import { terrainHeight, TERRACE_NORMAL, AUDIENCE_TERRAIN } from '../../../src/domain/audienceTerrain';

// Verbatim copy of the legacy src/main.ts 61-75 (before Phase 4), the reference for float parity.
const LEGACY_VEN = { X: 42, Z1: 58, STEPS: 30, RISE: 0.55, RUN: 1.15, WH: 7 };
function legacyTerrH(x: number, z: number): number {
  const zt = LEGACY_VEN.Z1 + LEGACY_VEN.STEPS * LEGACY_VEN.RUN,
    base = clamp(((z - LEGACY_VEN.Z1) / LEGACY_VEN.RUN) * LEGACY_VEN.RISE, 0, LEGACY_VEN.STEPS * LEGACY_VEN.RISE) + 4;
  const dx = Math.max(Math.abs(x) - LEGACY_VEN.X - 2, 0),
    dz = Math.max(z - zt, 0) + Math.max(-40 - z, 0) * 0.8,
    d = Math.hypot(dx, dz);
  if (d <= 0) return base;
  const nz =
    (Math.sin(x * 0.061) + Math.sin(z * 0.083 + 1.3) + Math.sin((x + z) * 0.047 + 2)) * 1.6 * Math.min(d / 12, 1);
  return base + Math.min(d * 0.55, 24) + (x < 0 ? Math.min(dx * 0.22, 12) : Math.min(dx * 0.16, 8)) + nz;
}

/** Stage area, pool floor, terraces, bowl edges, both hill sides and the far corners. */
const SAMPLES: readonly (readonly [number, number])[] = [
  [0, -10],
  [-20, -15],
  [10, 30],
  [0, 58],
  [-41.9, 70.3],
  [30, 92.5],
  [44, 60],
  [-44, 60],
  [-70, -62],
  [83.5, 15],
  [104, -28],
  [-230, 250],
  [230, -210],
  [12.5, -40.01],
];

const grid = (): (readonly [number, number])[] => {
  const points: (readonly [number, number])[] = [];
  for (let x = -230; x <= 230; x += 7.3) for (let z = -210; z <= 250; z += 6.1) points.push([x, z]);
  return points;
};

describe('domain/audienceTerrain', () => {
  it('keeps the legacy bowl dimensions', () => {
    expect(AUDIENCE_TERRAIN).toEqual(LEGACY_VEN);
  });

  it('keeps the legacy terrace normal exactly', () => {
    expect(TERRACE_NORMAL.toArray()).toEqual(new Vector3(0, 1, -0.55 / 1.15).normalize().toArray());
  });

  it('terrainHeight equals the legacy function bit for bit on named points and a grid over the whole terrain', () => {
    for (const [x, z] of [...SAMPLES, ...grid()]) expect(terrainHeight(x, z)).toBe(legacyTerrH(x, z));
  });

  it('covers both branches: flat inside the bowl, hills outside on both sides', () => {
    expect(terrainHeight(0, 30)).toBe(4);
    expect(terrainHeight(-100, 0)).toBeGreaterThan(terrainHeight(100, 0) - 10);
    expect(terrainHeight(-100, 0)).not.toBe(terrainHeight(0, 0));
  });
});
