import type { Rig } from './Rig';
export type { Rig } from './Rig';
import { addAngledTrusses } from './angledTrusses';
import { addAudienceWashes } from './audience';
import { addDeckFixtures } from './deck';
import { addFollowSpots } from './followSpots';
import { addFootlights } from './footlights';
import { addProfiles } from './profiles';
import { addRing } from './ring';
import { addTowers } from './towers';
import { addTrussRows } from './trusses';
import { addLadderWashes } from './sideLadders';
import { RigBuilder } from './RigBuilder';

/**
 * Builds the LUMA DESK rig: 405 fixtures. The areas run in the order the rig grew, which is the build order every id
 * list follows (101.., 801.., 201.., ...); reordering these calls changes groups, output order and the golden files.
 */
export function buildRig(): Rig {
  const rig = new RigBuilder();
  addTrussRows(rig);
  addLadderWashes(rig);
  addDeckFixtures(rig);
  addRing(rig);
  addAudienceWashes(rig);
  addTowers(rig);
  addAngledTrusses(rig);
  addFollowSpots(rig);
  addFootlights(rig);
  addProfiles(rig);
  return rig.build();
}
