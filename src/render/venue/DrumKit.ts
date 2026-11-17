import { CylinderGeometry, DoubleSide, Group, MeshStandardMaterial, SRGBColorSpace, type Object3D } from 'three';
import { DECK } from '../../domain/venue';
import { addMesh, createCanvasTexture, drawCanvas } from '../shared';
import { paintDrumLogo } from './drumLogoCanvas';
import { DrumParts } from './DrumParts';

/** The chrome spurs and stand feet around the floor toms, as [x, z] in kit space. */
const SPURS: readonly (readonly [x: number, z: number])[] = [
  [0.48, -0.62],
  [0.62, -0.62],
  [0.84, -0.2],
  [0.84, 0.1],
];

/**
 * Builds the full-size drum kit on the drum riser, facing the audience: kick with logo head, snare, toms, hi-hat,
 * four cymbals, throne and drum shield, built in kit space and then scaled 1.15 into place.
 */
export function buildDrumKit(scene: Object3D): void {
  const kit = new Group(),
    shell = new MeshStandardMaterial({ color: 0x9a0f22, metalness: 0.7, roughness: 0.25 }),
    head = new MeshStandardMaterial({ color: 0xece6da, roughness: 0.6 });
  const chrome = new MeshStandardMaterial({ color: 0xd8dce2, metalness: 1, roughness: 0.15 }),
    cymbal = new MeshStandardMaterial({ color: 0xd4a640, metalness: 0.95, roughness: 0.22, side: DoubleSide });
  const logo = createCanvasTexture(drawCanvas(256, 256, paintDrumLogo), { colorSpace: SRGBColorSpace });
  const parts = new DrumParts(kit, { shell, head, chrome, cymbal, logo });
  // kick, logo head toward the audience
  parts.drum({ r: 0.29, d: 0.48, at: [0, 0.3, 0.05], tilt: [Math.PI / 2, 0], front: true });
  parts.drum({ r: 0.18, d: 0.14, at: [-0.4, 0.66, -0.42], tilt: [-0.18, -0.12] }); // snare
  parts.drum({ r: 0.15, d: 0.2, at: [-0.16, 0.98, -0.12], tilt: [-0.5, 0.12] });
  parts.drum({ r: 0.17, d: 0.22, at: [0.2, 0.98, -0.12], tilt: [-0.5, -0.12] }); // rack toms
  parts.drum({ r: 0.21, d: 0.4, at: [0.55, 0.45, -0.5] });
  parts.drum({ r: 0.23, d: 0.42, at: [0.7, 0.46, -0.06] }); // floor toms
  for (const [x, z] of SPURS)
    addMesh(kit, new CylinderGeometry(0.012, 0.012, 0.3, 4), chrome, { position: [x, 0.15, z] });
  parts.stand(-0.72, -0.5, 0.95);
  for (const dy of [0, 0.025])
    addMesh(kit, new CylinderGeometry(0.03, 0.18, 0.02, 28), cymbal, { position: [-0.72, 0.95 + dy, -0.5] }); // hi-hat
  parts.cymbal({ at: [-0.62, 1.42, 0.02], r: 0.23, tilt: [0.3, 0.25] });
  parts.cymbal({ at: [0.42, 1.5, 0.08], r: 0.25, tilt: [0.3, -0.2] });
  parts.cymbal({ at: [0.92, 1.15, -0.32], r: 0.3, tilt: [0.15, -0.25] });
  parts.cymbal({ at: [-1.0, 1.28, -0.2], r: 0.22, tilt: [0.25, 0.45] }); // crashes, ride, china
  addMesh(
    kit,
    new CylinderGeometry(0.18, 0.16, 0.08, 16),
    new MeshStandardMaterial({ color: 0x111111, roughness: 0.7 }),
    {
      position: [0, 0.5, -0.82],
    },
  );
  addMesh(kit, new CylinderGeometry(0.03, 0.03, 0.45, 6), chrome, { position: [0, 0.23, -0.82] }); // throne
  parts.shield();
  kit.scale.setScalar(1.15);
  kit.position.set(0, DECK + 0.5, -9.55);
  scene.add(kit);
}
