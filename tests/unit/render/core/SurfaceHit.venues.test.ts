/** The venue ground under the stage boxes: terraces and pool floor in Sultan's Pool, a flat floor elsewhere. */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { surfacesOf } from '../../../../src/domain/stage/surfaces';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { VenueKind } from '../../../../src/domain/stage/types';
import { UP } from '../../../../src/domain/venue';
import { SurfaceHit } from '../../../../src/render/surface/SurfaceHit';

const down = (x: number, z: number): [Vector3, Vector3] => [new Vector3(x, 10, z), new Vector3(0, -1, 0)];

function surfacesIn(venue: VenueKind): SurfaceHit {
  const surfaces = new SurfaceHit();
  surfaces.setSurfaces(surfacesOf(BUILT_IN_DESIGN), venue);
  return surfaces;
}

describe('SurfaceHit per venue', () => {
  it('lands a beam beside the deck on the flat floor at y 0 in a black box and an open field', () => {
    for (const venue of ['black-box', 'open-field'] as const) {
      const hit = surfacesIn(venue).hit(...down(60, 0));
      expect(hit?.t).toBe(10);
      expect(hit?.normal).toBe(UP);
    }
  });

  it('lands the same beam nowhere in Sultan’s Pool, which has no floor past the audience bowl', () => {
    expect(surfacesIn('sultans-pool').hit(...down(60, 0))).toBeNull();
  });

  it('has terraces only in Sultan’s Pool; elsewhere a beam there lands on the flat floor', () => {
    const tier = surfacesIn('sultans-pool').hit(...down(10, 70));
    expect(tier?.normal).not.toBe(UP);
    expect(surfacesIn('black-box').hit(...down(10, 70))).toEqual({ t: 10, normal: UP });
  });

  it('still lands on the deck top before the flat floor', () => {
    expect(surfacesIn('black-box').hit(...down(0, -5))?.t).toBeCloseTo(10 - 1.8);
  });
});
