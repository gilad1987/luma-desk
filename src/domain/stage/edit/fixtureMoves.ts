import { parseFixtures } from '../parse/parseFixture';
import { isSameData } from '../sameData';
import type { StageDesign } from '../StageDesign';
import type { Vec3 } from '../types';
import { checkParserAccepts } from './inputChecks';
import { shiftFixture } from './trussOps';

const OP = 'moveFixtures';

/**
 * Moves the fixtures `ids` by `delta`, each with its pixel line, so a pixel strip never stays behind its fixture. The
 * show parser's fixture reader reads the moved list once (rule P6), not once per fixture, so a drag of a whole row
 * costs one parse. The op stores the parsed list, so the design in memory equals the design after a save and load.
 * When no id names a fixture, or the parsed list equals the stored one (a zero delta), it returns `d` itself, so
 * History adds no undo step.
 * @throws RangeError with every parser error of the moved list, for example a position that is not finite.
 */
export function moveFixtures(d: StageDesign, ids: readonly number[], delta: Vec3): StageDesign {
  const moving = new Set(ids);
  if (!d.fixtures.some((f) => moving.has(f.id))) return d;
  const moved = d.fixtures.map((f) => (moving.has(f.id) ? shiftFixture(f, delta) : f));
  const trussIds = new Set(d.trusses.map((t) => t.id));
  const { fixtures } = checkParserAccepts(OP, (r) => parseFixtures(r, { fixtures: moved }, trussIds));
  return isSameData(fixtures, d.fixtures) ? d : { ...d, fixtures };
}
