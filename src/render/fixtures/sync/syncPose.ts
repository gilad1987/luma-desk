import { Vector3 } from 'three';
import { D2R } from '../../../core';
import type { AttrValues } from '../../../domain/attributes';
import { dirFrom } from '../../../domain/aim';
import type { LightVisual } from '../FixtureVisual';
import { outputValue } from './BeamFrame';

/** Straight down: the rest direction of every head, lens and beam cone. */
export const DOWN = new Vector3(0, -1, 0);

/**
 * Moves the pose towards the output (movers ease with a 1/9 s time constant, statics snap), turns the gobo, writes
 * the beam direction into `dir` and turns the head: through its own yoke and tilt joints, or through the pivot.
 */
export function syncPose(v: LightVisual, o: Readonly<AttrValues>, dt: number, dir: Vector3): void {
  const p = v.pose,
    f = v.fixture,
    T = f.T;
  if (T.moving) {
    const k = 1 - Math.exp(-dt * 9);
    p.pan += (outputValue(o, 'pan') - p.pan) * k;
    p.tilt += (outputValue(o, 'tilt') - p.tilt) * k;
  } else {
    p.pan = outputValue(o, 'pan');
    p.tilt = outputValue(o, 'tilt');
  }
  p.gang += outputValue(o, 'grot') * dt * 0.05;
  dirFrom(f, p.pan, p.tilt, dir);
  if (v.joints) {
    v.joints.yoke.rotation.y = T.tiltOnly ? 0 : (v.flip ? -1 : 1) * p.pan * D2R;
    v.joints.tiltG.rotation.x = -p.tilt * D2R;
  } else v.pivot.quaternion.setFromUnitVectors(DOWN, dir);
}
