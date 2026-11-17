import { parseFixtures } from '../parse/parseFixture';
import type { StageDesign, StageFixture } from '../StageDesign';
import { checkParserAccepts } from './inputChecks';

const OP = 'setFixtureProps';

/**
 * Refuses a fixture patch that would give a design the show parser refuses (rule P6). Without it a bad panel value is
 * saved, and the next show load drops the whole stage for the built-in one. The parser's fixture reader checks the
 * patched fixture against the design's trusses, so it stays the one owner of the stored-fixture rules.
 * @throws RangeError with every parser error of the patched fixture, or when the patch changes the type of a
 * 'screen' fixture or of a fixture an LED wall points at.
 */
export function checkFixturePatch(
  d: StageDesign,
  fixture: StageFixture,
  patch: Partial<Omit<StageFixture, 'id'>>,
): void {
  const trussIds = new Set(d.trusses.map((t) => t.id));
  checkParserAccepts(OP, (r) => parseFixtures(r, { fixtures: [{ ...fixture, ...patch }] }, trussIds));
  if (patch.type !== undefined && patch.type !== fixture.type && drivesScreen(d, fixture)) {
    throw new RangeError(`${OP}: type of LED wall fixture ${fixture.id} must stay ${fixture.type}, got ${patch.type}`);
  }
}

/**
 * An LED wall reads its picture from the output of a 'screen' fixture, so that fixture keeps its type. For a fixture
 * a wall points at, the parser's screen rule refuses the same change, but the fixture reader alone cannot see the
 * screens. For a 'screen' fixture no wall points at yet, this is a product rule stricter than the parser.
 */
function drivesScreen(d: StageDesign, fixture: StageFixture): boolean {
  return fixture.type === 'screen' || d.screens.some((s) => s.fixtureId === fixture.id);
}
