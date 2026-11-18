import { CylinderGeometry, Group, MeshBasicMaterial, Vector3, type Material, type Object3D } from 'three';
import type { Vec3 } from '../../domain/stage/types';
import { UP } from '../../domain/venue';
import { addMesh } from '../shared';

/** The four chords of a square box truss, as corner signs. */
const CHORDS: readonly (readonly [x: number, z: number])[] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
/** The four lacing faces: their side signs and whether the diagonal tilts about x or z. */
const LACING: readonly (readonly [x: number, z: number, aboutX: boolean])[] = [
  [0, -1, false],
  [0, 1, false],
  [-1, 0, true],
  [1, 0, true],
];

/**
 * The shared parts of the rig steel: one thin unit tube (every chord, diagonal and chain is this tube, scaled), the
 * truss aluminium and the dark chain material. Sharing one geometry keeps thousands of truss meshes cheap. The stage
 * keeps one kit per venue: a rebuild on the same venue never frees or recreates these three resources, and a venue
 * switch frees the kit, as the new venue brings new steel, and creates it again.
 */
export class TrussKit {
  readonly tube = new CylinderGeometry(0.03, 0.03, 1, 6);
  readonly chainMaterial = new MeshBasicMaterial({ color: 0x2a2a2a });

  readonly steel: Material;

  constructor(steel: Material) {
    this.steel = steel;
  }

  /** The resources every build shares; a rebuild must not dispose them. */
  get shared(): readonly (CylinderGeometry | Material)[] {
    return [this.tube, this.chainMaterial, this.steel];
  }

  /** Frees the tube and the chain material; the steel belongs to the venue, which frees it with its materials. */
  dispose(): void {
    this.tube.dispose();
    this.chainMaterial.dispose();
  }

  /**
   * Adds a straight box truss from `a` to `b` with `spacing` between chords: 4 chords, then zig-zag lacing on all
   * four faces, in one group turned along the truss.
   */
  addSection(parent: Object3D, a: Vec3, b: Vec3, spacing: number): Group {
    const s = spacing,
      A = new Vector3(...a),
      B = new Vector3(...b),
      d = B.clone().sub(A),
      L = d.length(),
      mid = A.clone().add(B).multiplyScalar(0.5);
    const section = new Group();
    section.position.copy(mid);
    section.quaternion.setFromUnitVectors(UP, d.normalize());
    for (const [x, z] of CHORDS) {
      const chord = addMesh(section, this.tube, this.steel, { position: [(x * s) / 2, 0, (z * s) / 2] });
      chord.scale.set(1.4, L, 1.4);
    }
    const n = Math.max(1, Math.round(L / s));
    for (let i = 0; i < n; i++) {
      const yy = -L / 2 + ((i + 0.5) * L) / n,
        zig = ((i % 2 ? 1 : -1) * Math.PI) / 4;
      for (const [x, z, aboutX] of LACING) {
        const diagonal = addMesh(section, this.tube, this.steel, {
          position: [(x * s) / 2, yy, (z * s) / 2],
          rotation: aboutX ? [zig, 0, 0] : [0, 0, zig],
        });
        diagonal.scale.set(0.8, s * 1.41, 0.8);
      }
    }
    parent.add(section);
    return section;
  }

  /** Adds a chain motor line from the grid height `top` down to the point `at`. */
  addChain(parent: Object3D, [x, bottom, z]: Vec3, top: number): void {
    const chain = addMesh(parent, this.tube, this.chainMaterial, { position: [x, (top + bottom) / 2, z] });
    chain.scale.set(0.7, top - bottom, 0.7);
  }
}
