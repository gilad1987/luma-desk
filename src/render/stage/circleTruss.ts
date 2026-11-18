import { Euler, Group, InstancedMesh, Matrix4, Quaternion, TorusGeometry, Vector3, type Object3D } from 'three';
import type { TrussParams } from '../../domain/stage/trussTypes';
import type { Transform, Vec3 } from '../../domain/stage/types';
import { addMesh } from '../shared';
import type { TrussContext } from './lineTruss';
import { worldPoint } from './worldPoint';

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

/** The params of a circle truss. */
type CircleParams = Extract<TrussParams, { kind: 'circle' }>;

/**
 * Where the ring is drawn and its centre there. An unturned ring goes straight into the parent around its world
 * centre (no extra object, so the built-in rings keep their uuids); a turned ring gets its own group.
 */
function ringSpace(parent: Object3D, { position, rotation }: Transform): [Object3D, Vec3] {
  if (!rotation) return [parent, position];
  const group = new Group();
  group.position.set(...position);
  group.quaternion.set(...rotation);
  parent.add(group);
  return [group, [0, 0, 0]];
}

/** All lacing of the ring as one instanced mesh: per bay, a zig-zag diagonal on each of the four faces. */
function buildLacing(ctx: TrussContext, [x, y, z]: Vec3, R: number, s: number): InstancedMesh {
  const n = Math.round((Math.PI * 2 * R) / s),
    lacing = new InstancedMesh(ctx.kit.tube, ctx.kit.steel, n * 4),
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
      ps.set(x + Math.sin(a) * rr, y + (dy * s) / 2, z + Math.cos(a) * rr);
      if (face === 'v') e.set(0, a, zig, 'YXZ');
      else e.set(Math.PI / 2, a, zig, 'YXZ');
      q.setFromEuler(e);
      m4.compose(ps, q, sc);
      lacing.setMatrixAt(k++, m4);
    }
  }
  return lacing;
}

/**
 * Builds a box truss bent into a circle around the transform position: 4 torus chords, all lacing as one instanced
 * mesh, then the chains from `params.chains` (evenly spaced, turned by `phase`) up to the grid height `top`.
 */
export function buildCircleTruss(ctx: TrussContext, transform: Transform, params: CircleParams, top: number): void {
  const { radius: R, section: s } = params;
  const [space, centre] = ringSpace(ctx.parent, transform);
  const [x, y, z] = centre;
  for (const [dr, dy] of CHORDS)
    addMesh(space, new TorusGeometry(R + (dr * s) / 2, 0.045, 6, 160), ctx.kit.steel, {
      position: [x, y + (dy * s) / 2, z],
      rotation: [Math.PI / 2, 0, 0],
    });
  space.add(buildLacing(ctx, centre, R, s));
  const chains = params.chains ?? { count: 0, phase: 0 };
  for (let i = 0; i < chains.count; i++) {
    const a = (i / chains.count) * Math.PI * 2 + chains.phase;
    ctx.kit.addChain(ctx.parent, worldPoint(transform, [Math.sin(a) * R, 0, Math.cos(a) * R]), top);
  }
}
