import { Euler, InstancedMesh, Matrix4, Quaternion, TorusGeometry, Vector3, type Object3D } from 'three';
import { RING } from '../../domain/venue';
import { addMesh } from '../shared';
import type { TrussKit } from './TrussKit';

/** The four toroidal chords as signs of the radius and height offsets. */
const CHORDS: readonly (readonly [dr: number, dy: number])[] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
/** The lacing faces: inner and outer faces stand vertical ('v'), top and bottom lie flat ('h'). */
const FACES: readonly (readonly [dr: number, dy: number, face: 'v' | 'h'])[] = [
  [-1, 0, 'v'],
  [1, 0, 'v'],
  [0, -1, 'h'],
  [0, 1, 'h'],
];

/**
 * One ring level (beam `radius` around the ring centre, height `y`, `spacing` between chords). It is a parameter, not
 * a constant, because the rig hangs two rings of different size from one builder: the outer beam ring and the inner
 * wash ring.
 */
export interface RingLevel {
  readonly radius: number;
  readonly y: number;
  readonly spacing: number;
}

/**
 * Builds a box truss bent into a circle around the ring centre: 4 torus chords, all lacing as one instanced mesh,
 * and 6 chains up to the roof.
 */
export function buildRingTruss(scene: Object3D, kit: TrussKit, { radius: R, y, spacing: s }: RingLevel): void {
  for (const [dr, dy] of CHORDS)
    addMesh(scene, new TorusGeometry(R + (dr * s) / 2, 0.045, 6, 160), kit.steel, {
      position: [RING.x, y + (dy * s) / 2, RING.z],
      rotation: [Math.PI / 2, 0, 0],
    });
  const n = Math.round((Math.PI * 2 * R) / s),
    lacing = new InstancedMesh(kit.tube, kit.steel, n * 4),
    m4 = new Matrix4(),
    q = new Quaternion(),
    e = new Euler(),
    sc = new Vector3(0.9, s * 1.41, 0.9),
    ps = new Vector3();
  let k = 0;
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2,
      zig = ((i % 2 ? 1 : -1) * Math.PI) / 4;
    for (const [dr, dy, face] of FACES) {
      const rr = R + (dr * s) / 2;
      ps.set(RING.x + Math.sin(a) * rr, y + (dy * s) / 2, RING.z + Math.cos(a) * rr);
      if (face === 'v') e.set(0, a, zig, 'YXZ');
      else e.set(Math.PI / 2, a, zig, 'YXZ');
      q.setFromEuler(e);
      m4.compose(ps, q, sc);
      lacing.setMatrixAt(k++, m4);
    }
  }
  scene.add(lacing);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    kit.addChain(scene, RING.x + Math.sin(a) * R, y, RING.z + Math.cos(a) * R);
  }
}
