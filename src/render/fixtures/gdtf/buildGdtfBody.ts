import { Group, Mesh, Vector3, type BufferGeometry, type Matrix4 } from 'three';
import type { FixtureBody } from '../fixtureBody';
import type { BuiltModel } from '../models/ModelContext';
import { SECTIONS, type GdtfBodyProto, type Section } from './GdtfBodyProto';
import { GDTF_ROOT } from './gdtfRoot';
import { LENS_GAP } from './lensFace';

/** A GDTF body: the model contract, plus where its real tilt axis is. */
export interface GdtfBuilt extends BuiltModel {
  /** World offset from the fixture position to the point the beam turns about (`GdtfBodyProto.aimAt`). */
  readonly axisAt: Vector3;
  /** A body with an axis: the GDTF Beam origin (`at`) in the frame of the group that carries the lens (`holder`). */
  readonly beamFrom?: { readonly holder: Group; readonly at: Vector3 };
}

type Insertion = readonly [number, number, number];

function frameGroup(frame: Matrix4): Group {
  const group = new Group();
  frame.decompose(group.position, group.quaternion, group.scale);
  return group;
}

/** Puts the GDTF root on the insertion point, given in the desk frame; without one the tilt axis is the origin. */
function placeRoot(root: Group, proto: GdtfBodyProto, insertion: Insertion | undefined, c: FixtureBody): void {
  if (!insertion) root.position.copy(proto.aimAt).negate();
  else
    root.position
      .set(...insertion)
      .sub(c.g.position)
      .applyQuaternion(c.g.quaternion.clone().invert());
}

/**
 * Hangs a body without an axis in the static aim group, which turns it as a whole (the aim group undoes the roll of
 * the pivot's shortest arc). The pivot moves to the bolt height straight above the lens, which is the insertion point
 * when the lens is centred under it: the body turns about its own hanging point, not the desk origin, and the lens
 * stays on the beam line the frame update draws, `axisAt` plus `lensOff` along the beam.
 */
function hangStatic(root: Group, proto: GdtfBodyProto, c: FixtureBody): Pick<GdtfBuilt, 'axisAt' | 'lensOff'> {
  // a body without an axis aims at its lens: `aimAt` is the lens at rest, in the root frame
  const lens = proto.aimAt;
  c.pivot.position.set(lens.x, 0, lens.z).add(root.position);
  root.position.set(-lens.x, 0, -lens.z);
  (c.mount?.aim ?? c.pivot).add(root);
  return { axisAt: c.pivot.position.clone().applyQuaternion(c.g.quaternion), lensOff: -lens.y };
}

function lensMesh(proto: GdtfBodyProto, geometry: BufferGeometry, c: FixtureBody): Mesh {
  // the discs of a unit with several beams are already at their beam origins, in metres
  if (proto.lensDiscs) return new Mesh(proto.lensDiscs, c.lensMat);
  const lens = new Mesh(geometry, c.lensMat);
  proto.lensAt.decompose(lens.position, lens.quaternion, lens.scale);
  lens.scale.setScalar(proto.lensRadius);
  lens.translateY(-LENS_GAP);
  return lens;
}

/**
 * Builds one fixture's body from its prototype, in metres (the fixture group must have scale 1). The GDTF root sits
 * at the MVR insertion point and takes its pose from the fixture group alone: GDTF draws the device hanging, and the
 * MVR rotation turns that into the real pose, so there is no floor flip. The pan axis group is `joints.yoke` and the
 * tilt axis group `joints.tiltG`, both in the app frame, so the frame update turns them as it turns a desk model. A
 * body without an axis hangs in the pivot (`hangStatic`). At most four meshes: base, yoke, head, lens.
 */
export function buildGdtfBody(
  proto: GdtfBodyProto,
  lensGeometry: BufferGeometry,
  insertion: Insertion | undefined,
  c: FixtureBody,
): GdtfBuilt {
  const root = Object.assign(new Group(), { name: GDTF_ROOT });
  placeRoot(root, proto, insertion, c);
  const panFrame = frameGroup(proto.panAt),
    yoke = new Group(),
    tiltFrame = frameGroup(proto.tiltAt),
    tiltG = new Group();
  root.add(panFrame);
  panFrame.add(yoke);
  yoke.add(tiltFrame);
  tiltFrame.add(tiltG);
  const holders: Record<Section, Group> = { base: root, yoke, head: tiltG };
  const pick: Mesh[] = [];
  for (const section of SECTIONS) {
    const geometry = proto[section];
    if (!geometry) continue;
    const mesh = new Mesh(geometry, c.bodyMat);
    holders[section].add(mesh);
    pick.push(mesh);
  }
  const lens = lensMesh(proto, lensGeometry, c);
  holders[proto.lensIn].add(lens);
  const head = pick[pick.length - 1] ?? lens;
  if (!proto.moving) return { head, lens, joints: null, pick, ...hangStatic(root, proto, c) };
  c.g.add(root);
  const axisAt = root.position.clone().add(proto.aimAt).applyQuaternion(c.g.quaternion);
  const beamFrom = { holder: holders[proto.lensIn], at: new Vector3().setFromMatrixPosition(proto.lensAt) };
  return { head, lens, lensOff: proto.lensOff, joints: { yoke, tiltG }, pick, axisAt, beamFrom };
}
