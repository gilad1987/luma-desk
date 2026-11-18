import type { Object3D } from 'three';
import { SceneryRegistry } from '../stage/SceneryRegistry';
import type { StageSlots } from '../stage/StageSlots';
import { buildBackWall } from './BackWall';
import { buildBarricade } from './Barricade';
import { buildCityLights } from './CityLights';
import { TIERED_GROUND } from './crowdLayout';
import { buildFohRiser } from './FohRiser';
import { createVenueMaterials } from './materials';
import { buildOldCityWalls } from './OldCityWalls';
import { buildBandArea, buildCrowdArea } from './sceneryParts';
import { buildSky } from './Sky';
import { buildTerrain } from './Terrain';
import type { BuiltVenue } from './Venue';

/**
 * Builds Sultan's Pool, every part that is not a fixture, in the legacy order: the noise textures, crowd and uuids
 * draw from the seeded `Math.random`, so this order is render parity (decision 24). The deck, trusses and LED walls
 * go in through `stage` where the legacy scene built them; the crowd stands on the terraces.
 */
export function buildSultansPool(scene: Object3D, stage: StageSlots): BuiltVenue {
  const scenery = new SceneryRegistry();
  const sky = buildSky(scene);
  const materials = createVenueMaterials();
  stage.deck(materials);
  buildBackWall(scene, materials.black);
  const stone = buildTerrain(scene);
  const wallFloodlight = buildOldCityWalls(scene, stone);
  buildCityLights(scene);
  const fohRig = buildFohRiser(scene, materials);
  buildBarricade(scene);
  stage.trusses(materials);
  const { performers, band } = buildBandArea(scene, materials, scenery);
  const crowd = buildCrowdArea(scene, TIERED_GROUND, scenery);
  stage.screens(materials);
  return { sky, fohRig, wallFloodlight, performers, crowd, scenery, band };
}
