import { describe, expect, it } from 'vitest';
import { readGolden } from '../../../shared';
import { buildVenueHeadless } from './buildVenueHeadless';
import { dumpText } from './sceneDump';
import { digestVenue } from './venueDigest';

// tests/golden/venue-scene.json was recorded from the legacy src/main.ts (before Phase 4) in Chromium: an
// uncommitted tap set Math.random = rng(1234) just before the sky block (main.ts 166) and dumped the scene children
// added up to the LED wall frame (main.ts 1274) with dumpText. The same seed here means the uuids (three takes them
// from Math.random) and every random layout only match if the builders create the same objects in the same order.
describe('render/venue parity', () => {
  const { scene, venue, firstChild } = buildVenueHeadless();
  const digest = digestVenue(scene.children.slice(firstChild).map(dumpText));

  it('builds the same scene graph, with the same uuids, in the same order as the legacy script', () => {
    expect(digest).toStrictEqual(readGolden('venue-scene'));
  });

  it('returns the handles that later code needs', () => {
    expect(venue.fohRig).toHaveLength(2);
    expect(venue.performers).toHaveLength(38);
    expect(venue.wallFloodlight?.intensity).toBe(0);
    expect(venue.crowd.uJump.value).toBe(1);
  });
});
