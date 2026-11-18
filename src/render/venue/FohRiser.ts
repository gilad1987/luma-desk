import { BoxGeometry, MeshStandardMaterial, type Mesh, type Object3D } from 'three';
import { addMesh } from '../shared';
import type { VenueMaterials } from './materials';

/**
 * Builds the raised FOH riser and its desk in the audience. It returns both meshes, in build order, and keeps no
 * registry: `StageVenue` adds them to the camera views' `FohRig`; the RoboSpot station stands on them as a rider. The
 * rig hides them in the MA layout, where the camera stands at that spot behind the console.
 */
export function buildFohRiser(scene: Object3D, materials: VenueMaterials): Mesh[] {
  const riser = addMesh(scene, new BoxGeometry(8, 1.4, 4.5), materials.dark, { position: [0, 4.3, 47] });
  // quirk F7 (orig:1009): the legacy code passed this material as an argument, so it exists before the desk geometry
  const deskMaterial = new MeshStandardMaterial({ color: 0x15151a });
  const desk = addMesh(scene, new BoxGeometry(6.5, 0.9, 0.9), deskMaterial, { position: [0, 5.45, 46] });
  return [riser, desk];
}
