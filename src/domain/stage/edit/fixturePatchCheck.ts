import { parseFixtures } from '../parse/parseFixture';
import type { StageDesign, StageFixture } from '../StageDesign';
import { checkParserAccepts } from './inputChecks';

const OP = 'setFixtureProps';

/**
 * Builds the fixture list with the patch applied and reads it with the show parser's fixture reader (rule P6). Without
 * it a bad panel value is saved, and the next show load drops the whole stage for the built-in one. The reader checks
 * the whole list against the design's trusses, so it stays the one owner of the stored-fixture rules and an error
 * names the fixture's real index. The parsed list is returned, so the design in memory equals the design after a save
 * and load (a non-unit rotation is stored normalized).
 * @throws RangeError with every parser error of the patched list, or when the patch changes the type of a 'screen'
 * fixture.
 */
export function checkFixturePatch(
  d: StageDesign,
  fixture: StageFixture,
  patch: Partial<Omit<StageFixture, 'id'>>,
): StageFixture[] {
  const trussIds = new Set(d.trusses.map((t) => t.id));
  const patched = d.fixtures.map((f) => (f.id === fixture.id ? { ...f, ...patch } : f));
  const parsed = checkParserAccepts(OP, (r) => parseFixtures(r, { fixtures: patched }, trussIds));
  if (patch.type !== undefined && patch.type !== fixture.type && drivesScreen(fixture)) {
    throw new RangeError(`${OP}: type of screen fixture ${fixture.id} cannot change, got ${patch.type}`);
  }
  return parsed.fixtures;
}

/**
 * A product rule, stricter than the parser: an LED wall reads its picture from the output of a 'screen' fixture, so
 * that fixture keeps its type even before a wall points at it. The parser's screens rule already refuses the change
 * for a fixture a wall points at; the fixture reader alone cannot see the screens.
 */
function drivesScreen(fixture: StageFixture): boolean {
  return fixture.type === 'screen';
}
