import type { StageDesign } from '../StageDesign';
import type { Vec3 } from '../types';
import { roundToMillimetre } from './millimetres';
import { moveTruss } from './trussOps';

/**
 * Moves the truss `trussId` so it stands at `target`, rounded to 1 mm. It moves through `moveTruss` by
 * `target - current`, so the fixtures on it move by the same delta, then stores the rounded target as the truss
 * position, because `current + delta` is often one ulp off it (see `roundToMillimetre`). A target equal to the current
 * position returns `d` itself, so History adds no undo step.
 * @throws RangeError when the truss is missing or `target` is not finite (from `moveTruss`).
 */
export function placeTruss(d: StageDesign, trussId: string, target: Vec3): StageDesign {
  const truss = d.trusses.find((t) => t.id === trussId);
  if (!truss) throw new RangeError(`placeTruss: no truss with id ${trussId}`);
  const at = roundToMillimetre(target);
  const [x, y, z] = truss.transform.position;
  const moved = moveTruss(d, trussId, [at[0] - x, at[1] - y, at[2] - z]);
  if (moved === d) return d;
  const trusses = moved.trusses.map((t) =>
    t.id === trussId ? { ...t, transform: { ...t.transform, position: at } } : t,
  );
  return { ...moved, trusses };
}
