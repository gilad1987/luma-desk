import { Matrix4, Vector3, type Texture } from 'three';
import { beamVolume } from '../../beams/beamVolume';
import type { LightFrame } from '../../lights/LightFrame';
import { decalRadiance } from '../../lighting/poolBalance';
import { replacesPools, surfaceLight } from '../../lighting/surfaceLight';
import { SCREEN_NORMAL, type BeamHit } from '../../surface/SurfaceHit';
import type { BeamFrame } from './BeamFrame';
import { addPoolContributions } from './poolContributions';

const tU = new Vector3(),
  tV = new Vector3(),
  basis = new Matrix4();

/**
 * Lays the gobo pool flat on the hit surface, stretched by the incidence angle, with the gobo turned by the gobo
 * rotation, then adds the pool's share to the scene lights. No hit: the pool hides.
 */
export function syncPool(frame: BeamFrame, gob: number, goboTextures: readonly Texture[], out: LightFrame): void {
  const { visual: v, hit } = frame;
  // an MVR stage lights its scenery from the beam itself in the post chain: no decal, and no share for the stand-ins;
  // also not for the frames before that pass draws, so its decals never flash (`surfaceLight.isAwaited`); with
  // Real light off the pass holds no batch and the decals are the light on the floor again (`replacesPools`)
  const lights = surfaceLight.batch;
  if (!hit || replacesPools()) {
    v.pool.visible = false;
    const beams = beamVolume.batch;
    // the light is the beam's own row, with the incidence where the axis lands: the far end of its footprint
    if (lights && beams)
      lights.offer(v.beam, v.fixture.id, beams.row(v.beam), hit ? Math.abs(frame.dir.dot(hit.normal)) : 0);
    return;
  }
  v.pool.visible = true;
  placePool(frame, hit);
  const pl = v.pool,
    tx = poolTexture(frame, gob, goboTextures);
  tx.rotation = v.pose.gang;
  if (pl.material.map !== tx) {
    pl.material.map = tx;
    pl.material.needsUpdate = true;
  }
  const { intensity, col, length, tz } = frame,
    spec = v.fixture.T,
    r = length * tz,
    n = hit.normal;
  const gain = surfaceLight.poolGain;
  const poolIntensity =
    decalRadiance(intensity * spec.power, r) * (n === SCREEN_NORMAL || length > 24 ? 0.45 : 1) * gain;
  pl.material.color.setRGB(col[0] * poolIntensity, col[1] * poolIntensity, col[2] * poolIntensity);
  addPoolContributions(frame, n, out, gain);
}

/** Places the pool at the hit, offset along the normal by a per-fixture step so overlapping pools do not z-fight. */
function placePool(frame: BeamFrame, hit: BeamHit): void {
  const { visual: v, dir, origin, length, tz } = frame;
  const pl = v.pool,
    r = length * tz,
    n = hit.normal,
    cosA = Math.abs(dir.dot(n));
  tU.copy(dir).addScaledVector(n, -dir.dot(n));
  if (tU.lengthSq() < 1e-6) tU.set(1, 0, 0).cross(n).normalize();
  else tU.normalize();
  tV.crossVectors(n, tU);
  basis.makeBasis(tU, tV, n);
  pl.quaternion.setFromRotationMatrix(basis);
  pl.position
    .copy(origin)
    .addScaledVector(dir, length)
    .addScaledVector(n, 0.015 + (v.fixture.id % 7) * 0.002);
  pl.scale.set(r / Math.max(cosA, 0.22), r, 1);
}

/** The fixture's own copy of the gobo texture, cloned on first use (up to 8 per fixture, as before). */
function poolTexture({ visual: v }: BeamFrame, gob: number, goboTextures: readonly Texture[]): Texture {
  const cached = v.poolTex[gob];
  if (cached) return cached;
  const source = goboTextures[gob];
  if (!source) throw new RangeError(`Fixture ${v.fixture.id}: no gobo in slot ${gob}`);
  const copy = source.clone();
  copy.needsUpdate = true;
  v.poolTex[gob] = copy;
  return copy;
}
