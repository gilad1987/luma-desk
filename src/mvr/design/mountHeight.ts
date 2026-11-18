import type { FixtureTypeId } from '../../domain/FixtureType';
import { MOUNT_HEIGHTS } from '../../domain/fixtureTypes/mountHeights';
import type { Quat } from '../../domain/stage/types';
import type { Mount } from '../../domain/Fixture';

/** What decides the pose a fixture is drawn in. */
export interface MountPose {
  readonly type: FixtureTypeId;
  readonly mount: Mount;
  readonly rotation?: Quat | undefined;
}

/**
 * The distance in metres from a fixture's MVR insertion point (its mounting point) to the desk model origin, along
 * the body's base axis (MVR local -Z, three local -Y). A fixture with a body rotation is drawn as the hung model
 * turned by it; a floor unit in the rest pose is drawn on its own floor body, a mover on its base, a static on its
 * stand. The import and the export both use it, so a round trip lands every fixture where it was.
 */
export function mountHeight({ type, mount, rotation }: MountPose): number {
  const heights = MOUNT_HEIGHTS[type];
  return mount === 'floor' && rotation === undefined ? heights.floor : heights.hang;
}
