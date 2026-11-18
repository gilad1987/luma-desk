/**
 * hitSurface parity with the legacy maths: exact `t` and the same normal object, over seeded random rays and the
 * hand-picked quirk cases. Pool placement from the hit is the fixture sync's test.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { rng } from '../../../../src/core';
import { TERRACE_NORMAL } from '../../../../src/domain/audienceTerrain';
import { DECK, UP } from '../../../../src/domain/venue';
import { hitSurface } from '../../../../src/render/surface/hitSurface';
import { SCREEN_NORMAL } from '../../../../src/render/surface/SurfaceHit';
import { hitTerraces } from '../../../../src/render/surface/surfacePlanes';
import { legacyHitSurface } from './legacyHitSurface';

const ray = (o: [number, number, number], d: [number, number, number]): [Vector3, Vector3] => [
  new Vector3(...o),
  new Vector3(...d).normalize(),
];

function surfaceName(normal: Readonly<Vector3> | undefined): string {
  if (normal === TERRACE_NORMAL) return 'tier';
  if (normal === UP) return 'up';
  if (normal === SCREEN_NORMAL) return 'screen';
  return 'none';
}

describe('hitSurface', () => {
  it('matches the legacy t and normal object for 20000 seeded rays from rig positions', () => {
    const random = rng(4242);
    const span = (min: number, max: number): number => min + random() * (max - min);
    const counts: Record<string, number> = { tier: 0, up: 0, screen: 0, none: 0 };
    for (let i = 0; i < 20000; i++) {
      const [o, d] = ray([span(-45, 45), span(0, 30), span(-22, 100)], [span(-1, 1), span(-1, 0.3), span(-1, 1)]);
      const hit = hitSurface(o, d);
      const legacy = legacyHitSurface(o, d);
      expect([hit?.t, surfaceName(hit?.normal)]).toStrictEqual([legacy?.t, surfaceName(legacy?.normal)]);
      counts[surfaceName(hit?.normal)] = (counts[surfaceName(hit?.normal)] ?? 0) + 1;
    }
    expect(Object.values(counts).every((count) => count > 100)).toBe(true);
  });

  it('lets a deck hit replace a nearer terrace hit (legacy quirk)', () => {
    // from under the terraces toward the deck: the terrace plane is crossed first (z ~ 75), the deck later
    const [o, d] = ray([0, 10, 100], [0, DECK - 10, -110]);
    const tier = hitTerraces(o, d);
    const hit = hitSurface(o, d);
    expect([tier?.normal === TERRACE_NORMAL, hit?.normal === UP]).toStrictEqual([true, true]);
    expect((tier?.t ?? Infinity) < (hit?.t ?? 0)).toBe(true);
    expect(hit).toStrictEqual(legacyHitSurface(o, d));
  });

  it('hits the deck straight down from a truss and the pool floor in front of the stage', () => {
    const deck = hitSurface(...ray([0, 20, -10], [0, -1, 0]));
    const floor = hitSurface(...ray([0, 20, 20], [0, -1, 0]));
    expect([deck?.t, deck?.normal === UP, floor?.t, floor?.normal === UP]).toStrictEqual([20 - DECK, true, 20, true]);
  });

  it('hits the screen when it is nearer than the ground and misses a ray pointing up and away', () => {
    const screen = hitSurface(...ray([0, 10, 0], [0, 0, -1]));
    expect([screen?.normal, hitSurface(...ray([0, 10, 0], [0, 1, 1]))]).toStrictEqual([SCREEN_NORMAL, null]);
  });
});
