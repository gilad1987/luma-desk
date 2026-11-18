import type { StageBounds } from '../../domain/stage/types';
import type { CameraView } from '../camera/viewTable';
import { DEFAULT_FOV, tanHalfH, tanHalfV } from './lens';

/** The overview's angle round from the centre line, to audience left (degrees). */
const AZIMUTH = 37;
/** The overview's angle above the ground (degrees): a high 3/4 view that shows the deck and the roof. */
const ELEVATION = 32;
/** The fraction of the frame the box takes in the overview, leaving room for the ground around it. */
const FILL = 0.5;

const rad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * The overview (`wide`) of an imported stage: a high 3/4 view from audience left on the box centre, far enough that
 * the box's projected width and height take about half of a 16:9 frame. The projected size is the box's extent seen
 * from that angle, so a deep stage gets as much room as a wide one.
 */
export function wideView({ min, max }: StageBounds): CameraView {
  const [width, height, depth] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const [az, el] = [rad(AZIMUTH), rad(ELEVATION)];
  const across = width * Math.cos(az) + depth * Math.sin(az);
  const upright = height * Math.cos(el) + (width * Math.sin(az) + depth * Math.cos(az)) * Math.sin(el);
  const distance = Math.max(across / (2 * FILL * tanHalfH(DEFAULT_FOV)), upright / (2 * FILL * tanHalfV(DEFAULT_FOV)));
  const target: CameraView['target'] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const position: CameraView['position'] = [
    target[0] - distance * Math.sin(az) * Math.cos(el),
    target[1] + distance * Math.sin(el),
    target[2] + distance * Math.cos(az) * Math.cos(el),
  ];
  return { position, target, fov: DEFAULT_FOV };
}
