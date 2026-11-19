import type { StageDesign, StageFixture } from '../../domain/stage/StageDesign';
import { fixtureKey, occurrences } from '../design/fixtureKey';
import type { MvrFixtureRecord } from '../scene/MvrScene';

const withoutPatch = ({ patch: _patch, ...rest }: StageFixture): StageFixture => rest;

/**
 * Takes the patch off every fixture the desk wrote unpatched (`unpatchedBreaksOf`, by fixture key). Such a file holds
 * only the fixture's other breaks, and the patch step took the lowest of them for the desk patch, so the fixture came
 * back patched at an address that was never the desk's. The other breaks stay in the file as they are. The desk's
 * word holds only while the file agrees: once an address of the desk's break or of a lower one is in the file, another
 * program patched the fixture, and that address is the patch as in any file.
 */
export function keepUnpatched(
  design: StageDesign,
  vacant: ReadonlyMap<string, number>,
  records: readonly MvrFixtureRecord[],
): StageDesign {
  if (vacant.size === 0) return design;
  const counted = occurrences(records);
  const byKey = new Map(records.map((record) => [fixtureKey(record.uuid, counted.get(record) ?? 0), record]));
  const fixtures = design.fixtures.map((fixture) => {
    const info = design.mvr?.fixtures[String(fixture.id)];
    const key = info && fixtureKey(info.uuid, info.occurrence ?? 0);
    const open = key === undefined ? undefined : vacant.get(key);
    const record = key === undefined ? undefined : byKey.get(key);
    if (open === undefined || !record || !fixture.patch) return fixture;
    return record.addresses.some((address) => address.dmxBreak <= open) ? fixture : withoutPatch(fixture);
  });
  return { ...design, fixtures };
}
