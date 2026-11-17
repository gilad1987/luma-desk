import { Matrix4, Vector3, type Texture } from 'three';
import type { LightFrame } from '../../SceneLightsFrame';
import { SCREEN_NORMAL, type SurfaceHit } from '../../SurfaceHit';
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
  if (!hit) {
    v.pool.visible = false;
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
  const { I, col, L, tz } = frame,
    T = v.fixture.T,
    r = L * tz,
    n = hit.normal;
  const pI = ((I * T.power * 0.3) / (1 + r * 0.1)) * (n === SCREEN_NORMAL ? 0.45 : L > 24 ? 0.45 : 1);
  pl.material.color.setRGB(col[0] * pI, col[1] * pI, col[2] * pI);
  addPoolContributions(frame, n, out);
}

/** Places the pool at the hit, offset along the normal by a per-fixture step so overlapping pools do not z-fight. */
function placePool(frame: BeamFrame, hit: SurfaceHit): void {
  const { visual: v, dir, origin, L, tz } = frame;
  const pl = v.pool,
    r = L * tz,
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
    .addScaledVector(dir, L)
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
