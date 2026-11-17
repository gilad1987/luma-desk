import type { StageDesign, StageFixture } from '../StageDesign';
import { checkFinite } from './inputChecks';

const OP = 'setFixtureProps';

/**
 * Refuses a fixture patch that would give a design the show parser refuses (rule P6). Without it a bad panel value is
 * saved, and the next show load drops the whole stage for the built-in one. An LED wall fixture keeps its type,
 * because the wall reads its picture from the output of a 'screen' fixture.
 * @throws RangeError when a position, rotation or fixed angle is not finite, when `trussId` names no truss, or when
 * the patch changes the type of a 'screen' fixture or of a fixture an LED wall points at.
 */
export function checkFixturePatch(d: StageDesign, fixture: StageFixture, patch: Partial<StageFixture>): void {
  if (patch.position) checkFinite(OP, 'position', patch.position);
  if (patch.rotation) checkFinite(OP, 'rotation', patch.rotation);
  if (patch.fixed) checkFinite(OP, 'fixed', [patch.fixed.pan, patch.fixed.tilt]);
  const { trussId, type } = patch;
  if (trussId !== undefined && trussId !== null && !d.trusses.some((t) => t.id === trussId)) {
    throw new RangeError(`${OP}: trussId must name a truss, got ${trussId}`);
  }
  if (type !== undefined && type !== fixture.type && drivesScreen(d, fixture)) {
    throw new RangeError(`${OP}: type of LED wall fixture ${fixture.id} must stay ${fixture.type}, got ${type}`);
  }
}

function drivesScreen(d: StageDesign, fixture: StageFixture): boolean {
  return fixture.type === 'screen' || d.screens.some((s) => s.fixtureId === fixture.id);
}
