import type { StageFixture } from '../StageDesign';
import type { StageTruss, TrussParams } from '../trussTypes';
import type { Quat, Vec3 } from '../types';

/**
 * The truss mirrored across the centre line (x -> -x) under a new id. Mirroring the local points and the rotation
 * as well as the position keeps every world point an exact mirror: M(R·l + p) = (M·R·M)(M·l) + M·p.
 */
export function mirrorTruss(t: StageTruss, id: string): StageTruss {
  const { position, rotation } = t.transform;
  const transform = { position: mirrorPoint(position), ...(rotation ? { rotation: mirrorRotation(rotation) } : {}) };
  return { ...t, id, name: `${t.name} mirror`, transform, params: mirrorParams(t.params) };
}

/** A point mirrored across x = 0. `0 - x` keeps a zero as +0, so mirrored data deep-equals hand-written data. */
export function mirrorPoint(v: Vec3): Vec3 {
  return [0 - v[0], v[1], v[2]];
}

/** The rotation M·R·M for the mirror M across x = 0: a yaw or roll turns the other way, a pitch stays. */
function mirrorRotation(q: Quat): Quat {
  return [q[0], 0 - q[1], 0 - q[2], q[3]];
}

function mirrorParams(p: TrussParams): TrussParams {
  if (p.kind !== 'straight' && p.kind !== 'tower') return p;
  const parts = p.parts?.map((part) => ({ ...part, at: mirrorPoint(part.at) }));
  const chains = p.chains?.map(mirrorPoint);
  return { ...p, a: mirrorPoint(p.a), b: mirrorPoint(p.b), ...(parts ? { parts } : {}), ...(chains ? { chains } : {}) };
}

/** The fixture mirrored across x = 0: position, body rotation, fixed pan and pixel strip all flip. */
export function mirrorFixture(f: StageFixture): StageFixture {
  return {
    ...f,
    position: mirrorPoint(f.position),
    ...(f.rotation ? { rotation: mirrorRotation(f.rotation) } : {}),
    ...(f.fixed ? { fixed: { pan: 0 - f.fixed.pan, tilt: f.fixed.tilt } } : {}),
    ...(f.pixel ? { pixel: { ...f.pixel, p: mirrorPoint(f.pixel.p), tan: mirrorPoint(f.pixel.tan) } } : {}),
  };
}
