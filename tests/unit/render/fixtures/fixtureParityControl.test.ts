import { describe, expect, it } from 'vitest';
import { FIXTURE_GOLDEN, snapshotFirstFixtureBuild } from './firstFixtureBuild';

/** The uuid field of a `type uuid hash` snapshot line: under the seeded window it records creation order. */
const uuidOf = (line: string | undefined): string | undefined => line?.split(' ')[1];

// Its own file, so this build starts from the same three state as the golden and only the reorder can differ.
describe('fixture scene parity negative control', () => {
  it('fails when one object is created out of order', () => {
    const lines = snapshotFirstFixtureBuild(true);
    expect(lines).toHaveLength(FIXTURE_GOLDEN.length);
    expect(lines).not.toEqual(FIXTURE_GOLDEN);
    // the same objects with other uuids: the golden catches the creation order, not only a changed setting
    expect(lines.some((line, i) => uuidOf(line) !== uuidOf(FIXTURE_GOLDEN[i]))).toBe(true);
  });
});
