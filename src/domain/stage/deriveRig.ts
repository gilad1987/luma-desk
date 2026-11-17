import { Quaternion, Vector3 } from 'three';
import type { Rig } from '../rig/Rig';
import { RigBuilder } from '../rig/RigBuilder';
import type { StageDesign, StageFixture } from './StageDesign';

/**
 * The rig of a design: one fixture per design fixture, in design order, because that order is the rig build order
 * that groups, the output merge and the golden files follow. Positions are copied unchanged, so a design made from the
 * built-in rig gives back its exact floats. `pix` and `rotation` are set only when the design has them, so fixtures
 * without them keep no such key, as `buildRig()` makes them.
 */
export function rigFromDesign(d: StageDesign): Rig {
  const rig = new RigBuilder();
  for (const f of d.fixtures) addFixture(rig, f);
  return rig.build();
}

function addFixture(rig: RigBuilder, f: StageFixture): void {
  const [x, y, z] = f.position;
  const fixture = rig.add(f.id, f.type, x, y, z, f.mount, f.fixed);
  if (f.pixel) fixture.pix = { p: new Vector3(...f.pixel.p), tan: new Vector3(...f.pixel.tan), len: f.pixel.len };
  if (f.rotation) fixture.rotation = new Quaternion(...f.rotation);
}
