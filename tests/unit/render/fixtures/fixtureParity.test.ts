import { describe, expect, it } from 'vitest';
import { FIXTURE_GOLDEN, snapshotFirstFixtureBuild } from './firstFixtureBuild';

// The negative control lives in fixtureParityControl.test.ts: each file may build only once (see the helper).
describe('fixture scene parity with the legacy code path', () => {
  it('creates every object with the legacy type, uuid (creation order) and settings', () => {
    const lines = snapshotFirstFixtureBuild(false);
    expect(lines).toHaveLength(FIXTURE_GOLDEN.length);
    expect(lines).toEqual(FIXTURE_GOLDEN);
  });
});
