import { MeshStandardMaterial, PlaneGeometry, type Object3D } from 'three';
import { SceneryRegistry } from '../stage/SceneryRegistry';
import type { StageSlots } from '../stage/StageSlots';
import { addMesh } from '../shared';
import { FLAT_GROUND } from './crowdLayout';
import { createVenueMaterials } from './materials';
import { buildBandArea, buildCrowdArea } from './sceneryParts';
import { buildSky } from './Sky';
import type { BuiltVenue } from './Venue';

/** The side of the square ground plane, in metres: it reaches the sky dome's horizon around the stage. */
const GROUND_SIZE = 600;

/** The open ground under the stage and the crowd. */
function buildGround(scene: Object3D): void {
  const ground = addMesh(
    scene,
    new PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    new MeshStandardMaterial({ color: 0x14170f, roughness: 1 }),
    { rotation: [-Math.PI / 2, 0, 0] },
  );
  ground.receiveShadow = true;
}

/**
 * Builds an open field: the night sky over a flat ground, with the band and a crowd on it. The sky comes first, as
 * in Sultan's Pool, and the stage slots go in at the same points; it has no FOH riser and no floodlight.
 */
export function buildOpenField(scene: Object3D, stage: StageSlots): BuiltVenue {
  const scenery = new SceneryRegistry();
  const sky = buildSky(scene);
  const materials = createVenueMaterials();
  stage.deck(materials);
  buildGround(scene);
  stage.trusses(materials);
  const { performers, band } = buildBandArea(scene, materials, scenery);
  const crowd = buildCrowdArea(scene, FLAT_GROUND, scenery);
  stage.screens(materials);
  return { sky, fohRig: [], wallFloodlight: null, performers, crowd, scenery, band, materials };
}
