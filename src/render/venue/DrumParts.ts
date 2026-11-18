import {
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  MeshStandardMaterial,
  PlaneGeometry,
  type Material,
  type Texture,
} from 'three';
import { addMesh } from '../shared';
import type { CymbalSpec, DrumSpec } from './drumSpec';

/** The drum kit's own finishes. */
export interface DrumMaterials {
  readonly shell: Material;
  readonly head: Material;
  readonly chrome: Material;
  readonly cymbal: Material;
  /** The bass drum's front head art. */
  readonly logo: Texture;
}

/** Builds the repeated pieces of the drum kit into the kit group, in kit space (before the kit is scaled). */
export class DrumParts {
  readonly #kit: Group;
  readonly #m: DrumMaterials;

  constructor(kit: Group, materials: DrumMaterials) {
    this.#kit = kit;
    this.#m = materials;
  }

  /** A drum shell with its batter head and chrome rim; `front` adds the logo head (the kick drum). */
  drum({ r, d, at, tilt: [rx, rz] = [0, 0], front = false }: DrumSpec): void {
    const drum = new Group();
    drum.position.set(...at);
    drum.rotation.set(rx, 0, rz);
    addMesh(drum, new CylinderGeometry(r, r, d, 28), this.#m.shell);
    addMesh(drum, new CylinderGeometry(r * 1.01, r * 1.01, 0.012, 28), this.#m.head, { position: [0, d / 2, 0] });
    addMesh(drum, new CylinderGeometry(r * 1.03, r * 1.03, 0.02, 28), this.#m.chrome, { position: [0, -d / 2, 0] });
    if (front)
      addMesh(drum, new CircleGeometry(r * 0.99, 28), new MeshStandardMaterial({ map: this.#m.logo, roughness: 0.5 }), {
        position: [0, -d / 2 - 0.012, 0],
        rotation: [Math.PI / 2, 0, 0],
      });
    this.#kit.add(drum);
  }

  /** A chrome stand of height `h` on a three-leg tripod. */
  stand(x: number, z: number, h: number): void {
    addMesh(this.#kit, new CylinderGeometry(0.012, 0.012, h, 6), this.#m.chrome, { position: [x, h / 2, z] });
    for (let i = 0; i < 3; i++) {
      const a2 = i * 2.1;
      addMesh(this.#kit, new CylinderGeometry(0.008, 0.008, 0.4, 4), this.#m.chrome, {
        position: [x + Math.sin(a2) * 0.15, 0.1, z + Math.cos(a2) * 0.15],
        rotation: [Math.cos(a2) * 0.9, 0, -Math.sin(a2) * 0.9],
      });
    }
  }

  /** A cymbal of radius `r` on its own stand, tilted toward the drummer. */
  cymbal({ at: [x, y, z], r, tilt: [rx, rz] }: CymbalSpec): void {
    this.stand(x, z, y);
    addMesh(this.#kit, new CylinderGeometry(r * 0.12, r, 0.03, 32, 1, true), this.#m.cymbal, {
      position: [x, y, z],
      rotation: [rx, 0, rz],
    });
  }

  /** The clear acrylic drum shield: five panels in an arc in front of the kit. */
  shield(): void {
    const acrylic = new MeshStandardMaterial({
      color: 0xbfd6ff,
      transparent: true,
      opacity: 0.1,
      roughness: 0.05,
      metalness: 0.2,
      side: DoubleSide,
      depthWrite: false,
    });
    for (let i = -2; i <= 2; i++) {
      const a2 = i * 0.32;
      addMesh(this.#kit, new PlaneGeometry(0.62, 1.55), acrylic, {
        position: [Math.sin(a2) * 1.25, 0.78, 0.55 + Math.cos(a2) * 0.25 - 0.25 * Math.abs(i) * 0.5],
        rotation: [0, a2, 0],
      });
    }
  }
}
