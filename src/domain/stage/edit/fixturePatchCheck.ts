import { MOUNTS } from '../../Fixture';
import { TYPES } from '../../fixtureTypes';
import { MIN_QUAT_LENGTH } from '../parse/valueRules';
import type { StageDesign, StageFixture } from '../StageDesign';
import { FIXTURE_ROLES, type Quat } from '../types';
import { checkFinite } from './inputChecks';

const OP = 'setFixtureProps';

/**
 * Refuses a fixture patch that would give a design the show parser refuses (rule P6). Without it a bad panel value is
 * saved, and the next show load drops the whole stage for the built-in one. An LED wall fixture keeps its type,
 * because the wall reads its picture from the output of a 'screen' fixture.
 * @throws RangeError when a position, rotation, fixed angle or pixel strip value is not finite, when the rotation has
 * no direction, when the type, role or mount is not one the parser knows, when `trussId` names no truss, or when the
 * patch changes the type of a 'screen' fixture or of a fixture an LED wall points at.
 */
export function checkFixturePatch(d: StageDesign, fixture: StageFixture, patch: Partial<StageFixture>): void {
  checkNumbers(patch);
  checkChoices(patch);
  const { trussId, type } = patch;
  if (trussId !== undefined && trussId !== null && !d.trusses.some((t) => t.id === trussId)) {
    throw new RangeError(`${OP}: trussId must name a truss, got ${trussId}`);
  }
  if (type !== undefined && type !== fixture.type && drivesScreen(d, fixture)) {
    throw new RangeError(`${OP}: type of LED wall fixture ${fixture.id} must stay ${fixture.type}, got ${type}`);
  }
}

function checkNumbers(patch: Partial<StageFixture>): void {
  if (patch.position) checkFinite(OP, 'position', patch.position);
  if (patch.rotation) checkRotation(patch.rotation);
  if (patch.fixed) checkFinite(OP, 'fixed', [patch.fixed.pan, patch.fixed.tilt]);
  if (patch.pixel) {
    checkFinite(OP, 'pixel.p', patch.pixel.p);
    checkFinite(OP, 'pixel.tan', patch.pixel.tan);
    checkFinite(OP, 'pixel.len', [patch.pixel.len]);
  }
}

/** The parser normalizes a stored rotation, so one with no length cannot load; the limit is the parser's own. */
function checkRotation(rotation: Quat): void {
  checkFinite(OP, 'rotation', rotation);
  if (Math.hypot(...rotation) <= MIN_QUAT_LENGTH) {
    throw new RangeError(`${OP}: rotation must be longer than ${MIN_QUAT_LENGTH}, got [${rotation.join(', ')}]`);
  }
}

/** The type system already narrows these fields; a panel `<select>` value can still carry an unknown one at runtime. */
function checkChoices(patch: Partial<StageFixture>): void {
  if (patch.type !== undefined && !Object.hasOwn(TYPES, patch.type)) {
    throw new RangeError(`${OP}: type must be a known fixture type, got ${patch.type}`);
  }
  checkChoice('role', patch.role, FIXTURE_ROLES);
  checkChoice('mount', patch.mount, MOUNTS);
}

function checkChoice<T extends string>(name: string, value: T | undefined, options: readonly T[]): void {
  if (value !== undefined && !options.includes(value)) {
    throw new RangeError(`${OP}: ${name} must be one of ${options.join(', ')}, got ${value}`);
  }
}

function drivesScreen(d: StageDesign, fixture: StageFixture): boolean {
  return fixture.type === 'screen' || d.screens.some((s) => s.fixtureId === fixture.id);
}
