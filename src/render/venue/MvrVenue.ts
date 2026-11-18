import { MeshStandardMaterial, PlaneGeometry, type Object3D } from 'three';
import { SceneryRegistry } from '../stage/SceneryRegistry';
import type { StageSlots } from '../stage/StageSlots';
import { addMesh } from '../shared';
import { FLAT_GROUND } from './crowdLayout';
import { createVenueMaterials } from './materials';
import { buildBandArea, buildCrowdArea } from './sceneryParts';
import { buildSky } from './Sky';
import type { BuiltVenue } from './Venue';

/** The side of the square ground, in metres: it reaches the sky dome's horizon, far past a 60 x 80 m plot. */
const GROUND_SIZE = 600;
/**
 * How far the ground lies below the imported ground level (y 0), in metres: a floor mesh of the file at y 0 then
 * always draws over it instead of flickering with it, and a beam pool on it still sits on the visible floor.
 */
const GROUND_DROP = 0.05;

/** The object names the scene test hook reports, so a spec can tell this venue's parts from the others. */
export const MVR_VENUE_NAMES = { ground: 'mvr-ground', sky: 'sky', stars: 'stars' } as const;

/** The plain ground under the imported stage: near black and matte, so beams show as dim pools in a dark void. */
function buildGround(scene: Object3D): void {
  const ground = addMesh(
    scene,
    new PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    new MeshStandardMaterial({ color: 0x070708, roughness: 1 }),
    { position: [0, -GROUND_DROP, 0], rotation: [-Math.PI / 2, 0, 0] },
  );
  ground.name = MVR_VENUE_NAMES.ground;
  ground.receiveShadow = true;
}

/**
 * Builds the venue of an imported stage: the night sky over a plain dark ground, nothing else. The file brings its
 * own stage, so no terraces, walls, pool floor, barricade, back wall or FOH riser stand in or around it (a back wall
 * at the built-in stage's depth would cut through the imported set). The band and crowd are built like an open
 * field's, hidden by the design's scenery, so the builder's scenery toggles still work on an imported stage.
 */
export function buildMvrVenue(scene: Object3D, stage: StageSlots): BuiltVenue {
  const scenery = new SceneryRegistry();
  const sky = buildSky(scene);
  sky.dome.name = MVR_VENUE_NAMES.sky;
  sky.stars.name = MVR_VENUE_NAMES.stars;
  const materials = createVenueMaterials();
  stage.deck(materials);
  buildGround(scene);
  stage.trusses(materials);
  const { performers, band } = buildBandArea(scene, materials, scenery);
  const crowd = buildCrowdArea(scene, FLAT_GROUND, scenery);
  stage.screens(materials);
  return { sky, fohRig: [], wallFloodlight: null, performers, crowd, scenery, band, materials };
}
