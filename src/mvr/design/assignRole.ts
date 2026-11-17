import type { Mount } from '../../domain/Fixture';
import type { StageDeck } from '../../domain/stage/StageDesign';
import type { FixtureRole, Vec3 } from '../../domain/stage/types';
import type { Mat4 } from '../math/Mat4';

/**
 * How a fixture is mounted, from its MVR world matrix: `floor` when its rest beam (local -Z) points up, else `hang`.
 * MVR has no mount field, but the beam direction tells a floor unit from a hung one, which the desk's aim code needs.
 */
export function mountOf(matrix: Mat4): Mount {
  const beamZ = -(matrix[10] ?? 0);
  return beamZ > 0 ? 'floor' : 'hang';
}

/**
 * The role of an imported fixture, so default groups and presets that select by role work on an MVR rig. Floor units
 * are `floor`; a hung fixture in front of the deck's front edge (audience at +z) is `front`; one outside the deck's
 * x edges is `side`; the rest split the deck depth in thirds, `front`, `mid` and `back`.
 */
export function assignRole([x, , z]: Vec3, mount: Mount, deck: StageDeck): FixtureRole {
  if (mount === 'floor') return 'floor';
  if (z > deck.z1) return 'front';
  if (x < deck.x0 || x > deck.x1) return 'side';
  const depth = deck.z1 - deck.z0;
  const share = depth > 0 ? (deck.z1 - z) / depth : 0;
  if (share < 1 / 3) return 'front';
  return share < 2 / 3 ? 'mid' : 'back';
}
