import { clamp } from '../../../core';
import { beamVolume, VOLUME_LAYER } from '../../beams/beamVolume';
import { lensRadiusOf } from '../../beams/lensRadius';
import { packBeam, type BeamLook } from '../../beams/packBeam';
import { outputValue, type BeamFrame } from './BeamFrame';
import { DOWN } from './syncPose';

/** The carrier of the volume inputs; one for every fixture, so the frame loop allocates nothing. */
const LOOK: BeamLook = { output: 0, soft: 0, gobo: 0, rotation: 0, lensRadius: 0 };

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
  // an MVR stage draws the beam as a volume in its post chain. The cone leaves the scene pass by its layer and
  // keeps `visible`, which tells the volume that the fixture is lit in this frame.
  const batch = beamVolume.batch;
  bm.layers.set(batch ? VOLUME_LAYER : 0);
  if (!batch) return gob;
  batch.haze = bu.uHaze.value;
  batch.time = bu.uTime.value;
  // `beamK` is not used: it dims the flat cone of a wide type, and the volume gets that from the beam angle
  LOOK.output = intensity * spec.power;
  LOOK.soft = bu.uSoft.value;
  LOOK.gobo = gob;
  LOOK.rotation = v.pose.gang;
  // the maker's beam radius when the GDTF gives one to trust; the lens of the drawn body otherwise
  LOOK.lensRadius = v.beamRadius ?? lensRadiusOf(v.lens);
  packBeam(batch.row(bm), frame, LOOK);
  return gob;
}
