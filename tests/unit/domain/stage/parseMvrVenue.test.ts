/**
 * Owns the `mvr` venue rules outside the renderer: stored designs with it parse, an MVR import saved before it existed
 * (Sultan's Pool, every scenery part off) loads in it, and the Stage Builder never offers it.
 */
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../../src/domain/stage/parse/parseStageDesign';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { BUILDER_VENUE_KINDS, VENUE_KINDS } from '../../../../src/domain/stage/types';
import { sceneryFor } from '../../../../src/domain/stage/venueScenery';
import { venueCardsMarkup } from '../../../../src/ui/builder/startMarkup';
import { SAMPLE } from './parseSample';

const ALL_OFF = sceneryFor('mvr');
const MVR_SOURCE: StageDesign['source'] = { kind: 'mvr', name: 'Show.mvr' };

/** The venue `stored` loads with, after a JSON round trip as in a saved show. */
function loadedVenue(stored: StageDesign): StageDesign['venue'] | undefined {
  const result = parseStageDesign(JSON.parse(JSON.stringify(stored)));
  return result.ok ? result.design.venue : undefined;
}

describe('the mvr venue', () => {
  it('parses when stored', () => {
    const stored = { ...SAMPLE, source: MVR_SOURCE, venue: { kind: 'mvr' }, scenery: ALL_OFF } as const;
    expect(loadedVenue(stored)).toEqual({ kind: 'mvr' });
  });

  it("moves an old import saved in Sultan's Pool with every part off, keeping its grid height", () => {
    const stored = {
      ...SAMPLE,
      source: MVR_SOURCE,
      venue: { kind: 'sultans-pool', gridY: 7 },
      scenery: ALL_OFF,
    } as const;
    expect(loadedVenue(stored)).toEqual({ kind: 'mvr', gridY: 7 });
  });

  it('keeps the venue of an import with a scenery part on, and of every non-MVR design', () => {
    const withPart = { ...ALL_OFF, crowd: true };
    const pool = { kind: 'sultans-pool' } as const;
    expect(loadedVenue({ ...SAMPLE, source: MVR_SOURCE, venue: pool, scenery: withPart })).toEqual(pool);
    const builder = { kind: 'builder', name: 'Mine' } as const;
    expect(loadedVenue({ ...SAMPLE, source: builder, venue: pool, scenery: ALL_OFF })).toEqual(pool);
    expect(loadedVenue({ ...SAMPLE, source: MVR_SOURCE, venue: { kind: 'black-box' }, scenery: ALL_OFF })).toEqual({
      kind: 'black-box',
    });
  });

  it('is a venue kind the builder does not offer: no start card names it', () => {
    expect(VENUE_KINDS).toContain('mvr');
    expect(BUILDER_VENUE_KINDS).not.toContain('mvr');
    expect(venueCardsMarkup).not.toContain('data-venue="mvr"');
    for (const kind of BUILDER_VENUE_KINDS) expect(venueCardsMarkup).toContain(`data-venue="${kind}"`);
  });
});
