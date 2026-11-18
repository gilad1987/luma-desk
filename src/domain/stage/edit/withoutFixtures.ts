import type { StageDesign } from '../StageDesign';

/**
 * Removes the fixtures `gone` together with their `mvr.fixtures` entries. A freed id is given out again
 * (`nextIdBlock`), so an entry left behind would give a later fixture with that id the deleted fixture's MVR uuid and
 * GDTF name on export. Every edit that deletes fixtures goes through here, so none of them can keep a stale entry.
 */
export function withoutFixtures(d: StageDesign, gone: ReadonlySet<number>): StageDesign {
  const fixtures = d.fixtures.filter((f) => !gone.has(f.id));
  if (!d.mvr) return { ...d, fixtures };
  const entries = Object.entries(d.mvr.fixtures).filter(([id]) => !gone.has(Number(id)));
  return { ...d, fixtures, mvr: { ...d.mvr, fixtures: Object.fromEntries(entries) } };
}
