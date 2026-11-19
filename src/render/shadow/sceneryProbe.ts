import type { Scenery } from '../surface/collectScenery';
import { Ray } from '../surface/Ray';
import type { RayProbe } from './coneCasters';

/**
 * A ray probe on the scenery of the beam hit test (`SurfaceHit.sceneryHit`), so the triangles and their BVH exist
 * once. It only traces: which layers are shown is kept by `SceneryHit` on every beam ray, and a write from here
 * would hide a toggle from its hit cache. Null (a stage whose scenery has no triangle) gives a probe that hits nothing.
 */
export function sceneryProbe(scenery: Scenery | null): RayProbe {
  if (!scenery || scenery.triangleCount === 0) return () => Infinity;
  const ray = new Ray();
  return (origin, direction, near, far) => {
    ray.set(origin, direction, near, far);
    scenery.instances.trace(ray);
    return ray.prim >= 0 ? ray.t : Infinity;
  };
}
