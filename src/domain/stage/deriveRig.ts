import { Quaternion, Vector3 } from 'three';
import type { Rig } from '../rig/Rig';
import { RigBuilder } from '../rig/RigBuilder';
import { bodyScale } from '../fixtureTypes/bodyScale';
import type { MvrDesignInfo } from './mvr';
import { fileGelOf } from './mvrGel';
import type { StageDesign, StageFixture } from './StageDesign';

/**
 * The rig of a design: one fixture per design fixture, in design order, because that order is the rig build order
 * that groups, the output merge and the golden files follow. Positions are copied unchanged, so a design made from the
 * built-in rig gives back its exact floats. `pix` and `rotation` are set only when the design has them, so fixtures
 * without them keep no such key, as `buildRig()` makes them. `rotation` is normalized here because `aimAt` inverts it
 * by its conjugate, which needs a unit quaternion. `setFixtureProps` and `setTrussProps` store parser output, but the
 * other edit ops (mirror, add, duplicate) and the MVR import build designs without the parser.
 */
export function rigFromDesign(d: StageDesign): Rig {
  const rig = new RigBuilder();
  for (const f of d.fixtures) addFixture(rig, f, d.mvr);
  return rig.build();
}

function addFixture(rig: RigBuilder, f: StageFixture, mvr: MvrDesignInfo | undefined): void {
  const scale = bodyScale(f, mvr);
  const fixture = rig.add({ id: f.id, type: f.type, at: f.position, mount: f.mount, fixed: f.fixed });
  if (f.pixel) fixture.pix = { p: new Vector3(...f.pixel.p), tan: new Vector3(...f.pixel.tan), len: f.pixel.len };
  if (f.rotation) fixture.rotation = new Quaternion(...f.rotation).normalize();
  // set only when it differs, so every fixture without a sized GDTF keeps no such key, as `pix` and `rotation` do
  if (scale !== 1) fixture.bodyScale = scale;
  const gel = mvr && fileGelOf(mvr, mvr.fixtures[String(f.id)]);
  if (gel) fixture.gel = gel;
}
