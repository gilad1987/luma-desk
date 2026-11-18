import type { StageDesign } from '../../domain/stage/StageDesign';
import type { StageBounds } from '../../domain/stage/types';
import type { MvrGeometry } from '../../mvr/index';
import { mvrStageBounds } from './mvrCameraBounds';
import { panelPoints, proxyBoxes, proxyPoints, seatPoints } from './proxyPoints';
import { rigCluster } from './rigCluster';
import { seatCluster } from './seatCluster';
import { stageBackdrop } from './stageBackdrop';
import { floorOf, type StagePlace } from './stageViews';

/** Half the size of a fixture body (m), for the clear zone of a camera eye: a moving head with its yoke. */
const BODY = 0.3;

/**
 * The performance place of an imported stage for its views (`mvrViews`), by one rule for fixtures and seats: what
 * the views frame is the group that belongs to the stage, and what stands far from it is counted, never dropped.
 * - The stage is the densest fixture group with the scenery that touches it (`rigCluster`), inside the stage box of
 *   the fit (`mvrStageBounds`). The stage box holds every shown mesh that is not the hall, and a wide file has sign
 *   boards and towers far from its stage; FOH, Front and Side then showed the stage as a small part of the frame.
 *   `outliers` counts the fixtures outside the stage group.
 * - The seats are the drawn seats of the shown layers that belong to that stage (`seatCluster`): the seats of a
 *   layer the user hid give no place to the Crowd view and no room to the overview, and a second block far off
 *   does not shrink the stage in the Wide view. `farProxies` counts the seats and panels left out of the frame.
 * - `obstacles` are the boxes of what is drawn (meshes, proxies, fixture bodies), so no view puts its eye in or
 *   behind one (`clearEye`); a file without fixtures is marked, because its screens are then the stage.
 * The whole file stays in the scene box (`mvrCameraBounds`), which sets how far the camera zooms out.
 */
export function mvrStagePlace(design: StageDesign, geometry: MvrGeometry): StagePlace {
  const { deck, fixtures } = design;
  const deckBox: StageBounds = { min: [deck.x0, 0, deck.z0], max: [deck.x1, deck.height, deck.z1] };
  const { box, outliers } = rigCluster(
    fixtures.map((fixture) => fixture.position),
    [...geometry.surfaces, deckBox],
    mvrStageBounds(design, geometry),
  );
  const { seats, far } = seatCluster(seatPoints(design, geometry), panelPoints(design, geometry), box);
  const backdrop = stageBackdrop(geometry.surfaces, proxyPoints(design, geometry), floorOf({ stage: box, deck }));
  const bodies = fixtures
    .map((fixture) => fixture.position)
    .filter((position) => position.every(Number.isFinite))
    .map(([x, y, z]): StageBounds => ({ min: [x - BODY, y - BODY, z - BODY], max: [x + BODY, y + BODY, z + BODY] }));
  return {
    stage: box,
    deck,
    outliers,
    farProxies: far,
    obstacles: [...geometry.surfaces, ...proxyBoxes(design, geometry), ...bodies],
    ...(fixtures.length === 0 ? { isScreensOnly: true } : {}),
    ...(seats ? { seats } : {}),
    ...(backdrop === undefined ? {} : { backdrop }),
  };
}
