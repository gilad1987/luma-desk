import { BoxGeometry, MeshBasicMaterial, type Mesh, type Object3D } from 'three';
import { DECK } from '../../domain/venue';
import type { Vec3Tuple } from '../../core';
import { addMesh } from '../shared';
import type { BandMaterials } from './bandMaterials';
import { BAND_MEMBERS } from './bandMembers';
import { buildDrumKit } from './DrumKit';
import type { VenueMaterials } from './materials';
import { ORCHESTRA_ROWS } from './orchestraRows';
import { addPerformer } from './Performer';
import type { Performer } from './performerSpec';

/** Flags a mesh as a riser: the band layout pass also stretches risers and lets them take shadows. */
const markRiser = (mesh: Mesh): void => {
  mesh.userData['riser'] = 1;
};

/**
 * Builds the band backline and the band: drum and keys risers, the orchestra risers, the drum kit, the drum riser's
 * LED edge, amps, wedges, then the eight members. Returns the members for the beat animation.
 */
export function buildBand(scene: Object3D, venue: VenueMaterials, materials: BandMaterials): Performer[] {
  const riser = ([w, h, d]: Vec3Tuple, position: Vec3Tuple): void =>
    markRiser(addMesh(scene, new BoxGeometry(w, h, d), venue.dark, { position }));
  riser([5, 0.5, 3.2], [0, DECK + 0.25, -9.5]);
  riser([3.4, 0.5, 2.4], [6.5, DECK + 0.25, -8.5]);
  for (const sx of [-1, 1]) for (const r of ORCHESTRA_ROWS) riser([8.4, r.h, 2.2], [sx * 13.4, DECK + r.h / 2, r.z]);
  buildDrumKit(scene);
  const ledEdge = addMesh(
    scene,
    new BoxGeometry(5, 0.05, 0.05),
    new MeshBasicMaterial({ color: 0x8a1428, toneMapped: false }),
    { position: [0, DECK + 0.48, -7.88] },
  );
  markRiser(ledEdge);
  for (const x of [-6.5, -3.5, 3.5])
    addMesh(scene, new BoxGeometry(1.2, 1.4, 0.6), venue.dark, { position: [x, DECK + 0.7, -12.2] }); // amps
  for (const x of [-6, -2, 2, 6])
    addMesh(scene, new BoxGeometry(1, 0.5, 0.7), venue.dark, {
      position: [x, DECK + 0.25, -0.4],
      rotation: [-0.5, 0, 0],
    }); // wedges
  return BAND_MEMBERS.map((member) => addPerformer(scene, materials, member));
}
