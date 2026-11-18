import { parseFixtures } from '../parse/parseFixture';
import { isSameData } from '../sameData';
import type { StageDesign, StageFixture } from '../StageDesign';
import type { Vec3 } from '../types';
import { checkParserAccepts } from './inputChecks';
import { roundToMillimetre } from './millimetres';
import { shiftFixture } from './trussOps';

const OP = 'moveFixtures';

/**
 * Moves the fixtures `ids` by `delta`, each with its pixel line, so a pixel strip never stays behind its fixture. The
 * moved points are stored rounded to 1 mm (`roundToMillimetre`), so a typed position is stored as typed. The show
 * parser's fixture reader reads the moved list once (rule P6), not once per fixture, so a drag of a whole row costs
 * one parse. The op stores the parsed list, so the design in memory equals the design after a save and load. A zero
 * delta, ids that name no fixture, or a parsed list equal to the stored one return `d` itself, so History adds no
 * undo step.
 * @throws RangeError with every parser error of the moved list, for example a position that is not finite.
 */
export function moveFixtures(d: StageDesign, ids: readonly number[], delta: Vec3): StageDesign {
  const moving = new Set(ids);
  if (delta.every((v) => v === 0) || !d.fixtures.some((f) => moving.has(f.id))) return d;
  const moved = d.fixtures.map((f) => (moving.has(f.id) ? onMillimetres(shiftFixture(f, delta)) : f));
  const trussIds = new Set(d.trusses.map((t) => t.id));
  const { fixtures } = checkParserAccepts(OP, (r) => parseFixtures(r, { fixtures: moved }, trussIds));
  return isSameData(fixtures, d.fixtures) ? d : { ...d, fixtures };
}

function onMillimetres(f: StageFixture): StageFixture {
  const placed = { ...f, position: roundToMillimetre(f.position) };
  return f.pixel ? { ...placed, pixel: { ...f.pixel, p: roundToMillimetre(f.pixel.p) } } : placed;
}
