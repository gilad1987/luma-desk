import { toThree, type Aabb, type MvrProxy } from '../../../mvr/index';
import { dot, unit, type V3 } from './ledPose';

/** What says where the audience of an imported stage is; all positions in the stage frame, metres. */
export interface FrontEvidence {
  /** The centre of the drawn seat proxies; undefined for a file without seats. */
  readonly seats: V3 | undefined;
  /** The box of the file's geometry: its middle is where the stage is. */
  readonly venue: Aabb;
}

/** A wall whose face is within this cosine of edge-on to the audience direction gives no evidence by it. */
const SIDE_ON = 0.3;

/** The centre of the seat proxies that are drawn (a frame and a pitch), with the stage `offset`; none without seats. */
export function seatsCentre(proxies: readonly MvrProxy[] | undefined, offset: V3): V3 | undefined {
  let [x, y, z, count] = [0, 0, 0, 0];
  for (const { kind, frame, pitch } of proxies ?? []) {
    if (kind !== 'seat' || !frame || pitch === undefined) continue;
    const m = toThree(frame);
    [x, y, z, count] = [x + (m[12] ?? 0), y + (m[13] ?? 0), z + (m[14] ?? 0), count + 1];
  }
  return count === 0 ? undefined : [x / count + offset[0], y / count + offset[1], z / count + offset[2]];
}

/**
 * Which side of an LED wall is its front: +1 when `normal` at `centre` is, -1 when the other side is. The file does
 * not say, so the rule is stated here and used for the emitting face and for the wall's light alike. The front is the
 * side toward the seats when the file has seat proxies, else the side toward downstage (+Z), where the audience of
 * the desk's own stages sits. A wall that stands side-on to that direction (a side screen, a ceiling) takes the side
 * toward the middle of the venue.
 */
export function frontSign(centre: V3, normal: V3, evidence: FrontEvidence): 1 | -1 {
  const { seats, venue } = evidence;
  const to = (point: V3): V3 => [point[0] - centre[0], point[1] - centre[1], point[2] - centre[2]];
  const facing = dot(normal, seats ? unit(to(seats)) : [0, 0, 1]);
  const mid = (i: 0 | 1 | 2): number => ((venue.min[i] ?? 0) + (venue.max[i] ?? 0)) / 2;
  const middle: V3 = [mid(0), mid(1), mid(2)];
  const side = Math.abs(facing) < SIDE_ON ? dot(normal, to(middle)) : facing;
  return side < 0 ? -1 : 1;
}
