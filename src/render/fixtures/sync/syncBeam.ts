import { clamp } from '../../../core';
import { outputValue, type BeamFrame } from './BeamFrame';
import { DOWN } from './syncPose';

/**
 * Stretches the beam cone from the lens to the hit (or 85 m into the air, fading at the end) and sets its colour,
 * intensity (narrow beams look denser) and gobo. Returns the gobo slot, which the pool shows too.
 */
export function syncBeam(frame: BeamFrame): number {
  const { visual: v, o, intensity, col, dir, origin, zoom, tz, hit, length } = frame;
  const f = v.fixture,
    spec = f.T,
    bm = v.beam,
    bu = v.uniforms;
  bm.position.copy(origin);
  bm.quaternion.setFromUnitVectors(DOWN, dir);
  const rr = Math.max(length * tz, 0.02);
  bm.scale.set(rr, length, rr);
  bu.uColor.value.setRGB(col[0], col[1], col[2]);
  bu.uInt.value = intensity * spec.power * (spec.beamK ?? 1) * 0.38 * clamp(Math.pow(14 / (zoom + 4), 0.8), 0.06, 2.2);
  bu.uLen.value = length;
  bu.uEnd.value = hit ? 0 : 1;
  const gob = f.has('gobo') ? Math.round(outputValue(o, 'gobo')) : 0;
  bu.uGobo.value = gob;
  bu.uGRot.value = v.pose.gang;
  return gob;
}
