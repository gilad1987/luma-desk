import type { Mesh, Object3D, PointLight } from 'three';
import type { StageSlots } from '../stage/StageSlots';
import { buildBackWall } from './BackWall';
import { buildBandStage } from './BandStage';
import { buildBarricade } from './Barricade';
import { buildCityLights } from './CityLights';
import { buildCrowd } from './Crowd';
import type { CrowdBounceUniforms } from './crowdBounce';
import { buildFohRiser } from './FohRiser';
import { createVenueMaterials } from './materials';
import { buildOldCityWalls } from './OldCityWalls';
import { buildPaHangs } from './PaHangs';
import type { Performer } from './performerSpec';
import { buildSky, type Sky } from './Sky';
import { buildTerrain } from './Terrain';

/** The venue handles that the camera views, fixture visuals and frame loop need after the build. */
export interface Venue {
  readonly sky: Sky;
  /** The FOH riser and desk in build order; `wireFixtureVisuals` adds them to `views.fohRig` before the props. */
  readonly fohRig: Mesh[];
  /** Forced dark every frame by the fixture sync (legacy quirk). */
  readonly wallFloodlight: PointLight;
  readonly performers: readonly Performer[];
  readonly crowd: CrowdBounceUniforms;
}

/**
 * Builds every part of the scene that is not a fixture, in the legacy order. three.js takes each object's uuid from
 * the seeded `Math.random`, and the noise textures and crowd use it too, so this order is render parity (decision
 * 24): call it once, after the environment lights and before the scene lights and fixtures. The stage parts of the
 * design (deck, trusses, LED walls) go in through `stage` at the points where the legacy scene built them.
 */
export function buildVenue(scene: Object3D, stage: StageSlots): Venue {
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
  buildPaHangs(scene, materials.dark);
  const performers = buildBandStage(scene, materials);
  const crowd = buildCrowd(scene);
  stage.screens(materials);
  return { sky, fohRig, wallFloodlight, performers, crowd };
}
