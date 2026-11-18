import { describe, expect, it } from 'vitest';
import { FIXTURE_GOLDEN, snapshotFirstFixtureBuild } from './firstFixtureBuild';

/** The type field of a `type uuid hash` snapshot line: equal type columns mean the same objects in the same slots. */
const typeOf = (line: string): string | undefined => line.split(' ')[0];

/** The uuid field of a `type uuid hash` snapshot line: under the seeded window it records creation order. */
const uuidOf = (line: string | undefined): string | undefined => line?.split(' ')[1];

// Its own file, so this build starts from the same three state as the golden and only the reorder can differ.
describe('fixture scene parity negative control', () => {
  it('fails when one object is created out of order', () => {
    const lines = snapshotFirstFixtureBuild(true);
    expect(lines.map(typeOf)).toEqual(FIXTURE_GOLDEN.map(typeOf));
    expect(lines).not.toEqual(FIXTURE_GOLDEN);
    // the same objects with other uuids: the golden catches the creation order, not only a changed setting
    expect(lines.some((line, i) => uuidOf(line) !== uuidOf(FIXTURE_GOLDEN[i]))).toBe(true);
  });
});
