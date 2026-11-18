import type { Mesh, Object3D, PointLight } from 'three';
import { buildBandStage } from './BandStage';
import { buildBarricade } from './Barricade';
import { buildCityLights } from './CityLights';
import { buildCrowd } from './Crowd';
import type { CrowdBounceUniforms } from './crowdBounce';
import { buildFohRiser } from './FohRiser';
import { buildLedWall, type LedWall } from './LedWall';
import { createVenueMaterials } from './materials';
import { buildOldCityWalls } from './OldCityWalls';
import type { Performer } from './performerSpec';
import { buildSky, type Sky } from './Sky';
import { buildStage } from './Stage';
import { buildTerrain } from './Terrain';
import { buildTrusses } from './Trusses';

/** The venue handles that the camera views, fixture visuals and frame loop need after the build. */
export interface Venue {
  readonly sky: Sky;
  /** The FOH riser and desk in build order; `wireFixtureVisuals` adds them to `views.fohRig` before the props. */
  readonly fohRig: Mesh[];
  /** Forced dark every frame by the fixture sync (legacy quirk). */
  readonly wallFloodlight: PointLight;
  readonly performers: readonly Performer[];
  readonly crowd: CrowdBounceUniforms;
  readonly ledWall: LedWall;
}

/**
 * Builds every part of the scene that is not a fixture, in the legacy order. three.js takes each object's uuid from
 * the seeded `Math.random`, and the noise textures and crowd use it too, so this order is render parity (decision
 * 24): call it once, after the environment lights and before the scene lights and fixtures.
 */
export function buildVenue(scene: Object3D): Venue {
  const sky = buildSky(scene);
  const materials = createVenueMaterials();
  buildStage(scene, materials);
  const stone = buildTerrain(scene);
  const wallFloodlight = buildOldCityWalls(scene, stone);
  buildCityLights(scene);
  const fohRig = buildFohRiser(scene, materials);
  buildBarricade(scene);
  buildTrusses(scene, materials);
  const performers = buildBandStage(scene, materials);
  const crowd = buildCrowd(scene);
  const ledWall = buildLedWall(scene, materials.dark);
  return { sky, fohRig, wallFloodlight, performers, crowd, ledWall };
}
