import type { Rig } from '../../domain/rig/Rig';

/**
 * The ids that name the same fixture on both rigs: the id is on both and its fixture type is the same. A cue value is
 * written for one fixture; when a new rig gives its id to another kind of fixture (an imported file keeps its own ids),
 * the value would aim or colour a fixture it was never written for. A re-import of the same file keeps every id.
 */
export function sameFixtureIds(before: Rig, after: Rig): ReadonlySet<number> {
  const typeBefore = new Map(before.fixtures.map((f) => [f.id, f.type]));
  return new Set(after.fixtures.filter((f) => typeBefore.get(f.id) === f.type).map((f) => f.id));
}
