/**
 * The legacy `hitSurface` (index.html:1697–1713, src/main.ts before Phase 6), kept verbatim as the parity oracle.
 * Only the types and the normal constants are adapted; the arithmetic and branch order are unchanged.
 */
import type { Vector3 } from 'three';
import { TIER_N, VEN } from '../../../../src/domain/audienceTerrain';
import { DECK, SCREEN, STAGE, UP } from '../../../../src/domain/venue';
import { SCREEN_NORMAL as NZ, type SurfaceHit } from '../../../../src/render/SurfaceHit';

type Hit = { t: number; n: Readonly<Vector3> } | null;

/** Runs the legacy maths and returns its result in the new shape. */
export function legacyHitSurface(o: Vector3, d: Vector3): SurfaceHit | null {
  let best: Hit = null;
  {
    const den = d.y - (VEN.RISE / VEN.RUN) * d.z;
    if (Math.abs(den) > 1e-4) {
      const t = (((o.z - VEN.Z1) * VEN.RISE) / VEN.RUN - o.y) / den;
      if (t > 0) {
        const x = o.x + d.x * t,
          z = o.z + d.z * t;
        if (Math.abs(x) < VEN.X && z > VEN.Z1 && z < VEN.Z1 + VEN.STEPS * VEN.RUN) best = { t, n: TIER_N };
      }
    }
  }
  if (d.y < -1e-4) {
    let t = (DECK - o.y) / d.y;
    if (t > 0) {
      const x = o.x + d.x * t,
        z = o.z + d.z * t;
      if (x > STAGE.x0 && x < STAGE.x1 && z > STAGE.z0 && z < STAGE.z1 && o.y > DECK) best = { t, n: UP };
    }
    if (!best) {
      t = -o.y / d.y;
      const x = o.x + d.x * t,
        z = o.z + d.z * t;
      const inStage = x > STAGE.x0 && x < STAGE.x1 && z > STAGE.z0 && z < STAGE.z1;
      if (t > 0 && !inStage && Math.abs(x) < VEN.X && z < VEN.Z1 && z > STAGE.z0 - 6) best = { t, n: UP };
    }
  }
  if (d.z < -1e-4 && o.z > SCREEN.z) {
    const t = (SCREEN.z + 0.05 - o.z) / d.z;
    if (t > 0 && (!best || t < best.t)) {
      const x = o.x + d.x * t,
        y = o.y + d.y * t;
      if (x > SCREEN.x0 - 5 && x < SCREEN.x1 + 5 && y > DECK && y < 27) best = { t, n: NZ };
    }
  }
  return best ? { t: best.t, normal: best.n } : null;
}
