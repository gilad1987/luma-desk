import type { StageDesign } from '../StageDesign';

/**
 * Removes the fixtures `gone` together with their `mvr.fixtures` entries. The entry goes with its fixture, so the saved
 * design still parses (`checkMvrFixtureIds` rejects an entry without a fixture) and the export never carries a dead
 * fixture's MVR uuid or GDTF name. Every edit that deletes fixtures goes through here, so none can keep a stale entry.
 */
export function withoutFixtures(d: StageDesign, gone: ReadonlySet<number>): StageDesign {
  const fixtures = d.fixtures.filter((f) => !gone.has(f.id));
  if (!d.mvr) return { ...d, fixtures };
  const entries = Object.entries(d.mvr.fixtures).filter(([id]) => !gone.has(Number(id)));
  return { ...d, fixtures, mvr: { ...d.mvr, fixtures: Object.fromEntries(entries) } };
}
