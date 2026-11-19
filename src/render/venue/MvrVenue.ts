import type { Object3D } from 'three';
import { SceneryRegistry } from '../stage/SceneryRegistry';
import type { StageSlots } from '../stage/StageSlots';
import { addMesh } from '../shared';
import { FLAT_GROUND } from './crowdLayout';
import { hallFloorGeometry, hallFloorMaterial } from './hallFloor';
import { createVenueMaterials } from './materials';
import { buildBandArea, buildCrowdArea } from './sceneryParts';
import type { BuiltVenue } from './Venue';

/**
 * How far the ground lies below the imported ground level (y 0), in metres: a floor mesh of the file at y 0 then
 * always draws over it instead of flickering with it, and a beam pool on it still sits on the visible floor.
 */
const GROUND_DROP = 0.05;

/** The object names the scene test hook reports, so a spec can tell this venue's parts from the others. */
export const MVR_VENUE_NAMES = { ground: 'mvr-ground' } as const;

/** The hall floor under the imported stage (`hallFloor`): dark and matte, its edge fading into the background. */
function buildGround(scene: Object3D): void {
  const ground = addMesh(scene, hallFloorGeometry(), hallFloorMaterial(), {
    position: [0, -GROUND_DROP, 0],
    rotation: [-Math.PI / 2, 0, 0],
  });
  ground.name = MVR_VENUE_NAMES.ground;
  ground.receiveShadow = true;
  // the floor blends for its fading rim, so it is drawn before every other blended object (beam pools lie on it)
  ground.renderOrder = -1;
}

/**
 * Builds the venue of an imported stage: a plain dark ground, nothing else. No sky or stars: the file is an indoor
 * hall as often as not, and the hall light (`MvrHallLight`) gives it a neutral dark background. The file brings its
 * own stage, so no terraces, walls, pool floor, barricade, back wall or FOH riser stand in or around it (a back wall
 * at the built-in stage's depth would cut through the imported set). The band and crowd are built like an open
 * field's, hidden by the design's scenery, so the builder's scenery toggles still work on an imported stage.
 */
export function buildMvrVenue(scene: Object3D, stage: StageSlots): BuiltVenue {
  const scenery = new SceneryRegistry();
  const materials = createVenueMaterials();
  stage.deck(materials);
  buildGround(scene);
  stage.trusses(materials);
  const { performers, band } = buildBandArea(scene, materials, scenery);
  const crowd = buildCrowdArea(scene, FLAT_GROUND, scenery);
  stage.screens(materials);
  return { sky: null, fohRig: [], wallFloodlight: null, performers, crowd, scenery, band, materials };
}
