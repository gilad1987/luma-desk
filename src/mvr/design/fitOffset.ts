import type { Vec3 } from '../../domain/stage/types';
import { STAGE } from '../../domain/venue';
import { isEmpty, type Aabb } from '../math/Aabb';
import type { MvrWarning } from '../MvrWarning';

/** The world z the fitted footprint is centred on: the middle of the stage deck's depth. */
const STAGE_CENTRE_Z = (STAGE.z0 + STAGE.z1) / 2;

/**
 * The world offset that puts an MVR file on the desk's stage: the x/z centre of `box` (three frame, before the fit:
 * the fixtures and every placed mesh) goes to x = 0 and the middle of the stage depth, and MVR Z = 0 stays on the
 * ground (y = 0). Plots are drawn around arbitrary origins, so centring is needed; there is no scaling, because the
 * file's real sizes must stay true. A footprint wider or deeper than the stage gets an `oversize` warning, as the
 * venue model will not match it. An empty box gives the offset of the stage centre.
 */
export function fitOffset(box: Aabb, warn: (warning: MvrWarning) => void): Vec3 {
  if (isEmpty(box)) return [0, 0, STAGE_CENTRE_Z];
  const width = box.max[0] - box.min[0];
  const depth = box.max[2] - box.min[2];
  if (width > STAGE.x1 - STAGE.x0 || depth > STAGE.z1 - STAGE.z0) {
    const size = `${width.toFixed(1)} m x ${depth.toFixed(1)} m`;
    warn({ code: 'oversize', message: `The file covers ${size}, which is larger than the stage.` });
  }
  return [-(box.min[0] + box.max[0]) / 2, 0, STAGE_CENTRE_Z - (box.min[2] + box.max[2]) / 2];
}
