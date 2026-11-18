import { BoxGeometry, MeshStandardMaterial, PlaneGeometry, type Object3D } from 'three';
import { SceneryRegistry } from '../stage/SceneryRegistry';
import type { StageSlots } from '../stage/StageSlots';
import { addMesh } from '../shared';
import { FLAT_GROUND } from './crowdLayout';
import { createVenueMaterials } from './materials';
import { buildBandArea, buildCrowdArea } from './sceneryParts';
import type { BuiltVenue } from './Venue';

/** The room's half width, its back and front wall z and its height, in metres: wider than the crowd and the rig. */
const ROOM = { halfWidth: 50, back: -30, front: 100, height: 30 } as const;
/** Wall thickness, so the walls cast and take light from both sides. */
const WALL = 0.5;

/** The dark floor and the four walls of the room, one matte black material for all of them. */
function buildRoom(scene: Object3D): void {
  const black = new MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.95 });
  const depth = ROOM.front - ROOM.back,
    midZ = (ROOM.back + ROOM.front) / 2,
    midY = ROOM.height / 2;
  const floor = addMesh(scene, new PlaneGeometry(ROOM.halfWidth * 2, depth), black, {
    position: [0, 0, midZ],
    rotation: [-Math.PI / 2, 0, 0],
  });
  floor.receiveShadow = true;
  for (const z of [ROOM.back, ROOM.front])
    addMesh(scene, new BoxGeometry(ROOM.halfWidth * 2, ROOM.height, WALL), black, { position: [0, midY, z] });
  for (const sx of [-1, 1])
    addMesh(scene, new BoxGeometry(WALL, ROOM.height, depth), black, { position: [sx * ROOM.halfWidth, midY, midZ] });
}

/**
 * Builds a black box: a dark room around the stage with the band and a crowd on its flat floor. It has no sky, no
 * FOH riser and no floodlight; the stage slots go in at the same points as in Sultan's Pool.
 */
export function buildBlackBox(scene: Object3D, stage: StageSlots): BuiltVenue {
  const scenery = new SceneryRegistry();
  const materials = createVenueMaterials();
  stage.deck(materials);
  buildRoom(scene);
  stage.trusses(materials);
  const { performers, band } = buildBandArea(scene, materials, scenery);
  const crowd = buildCrowdArea(scene, FLAT_GROUND, scenery);
  stage.screens(materials);
  return { sky: null, fohRig: [], wallFloodlight: null, performers, crowd, scenery, band };
}
