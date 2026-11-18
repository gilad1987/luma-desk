import { framePoint, LENS, RANGE, read, TAN } from './beamFrame';

/** Four points of a disc edge, as (side, up) pairs. */
const RIM = [1, 0, -1, 0, 0, 1, 0, -1] as const;

/** A point this near the eye plane (clip w) or behind it has no screen position. */
const MIN_W = 1e-4;

const clamp = (ndc: number): number => Math.min(1, Math.max(-1, ndc));

/**
 * The part of the screen (0 to 1) that the clip-space box of a beam cone covers. The box is taken around four points
 * of the lens disc and four of the end disc: a score, not a bound. A cone that crosses the eye plane counts as the
 * whole screen, as such a beam is around the viewer; one fully behind the eye counts as nothing.
 * `viewProjection` is the camera's projection times view matrix, column by column.
 */
export function coneScreenArea(frame: Float64Array, viewProjection: ArrayLike<number>): number {
  const m = viewProjection;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let behind = 0;
  for (const z of [read(frame, LENS), read(frame, RANGE)]) {
    const radius = z * read(frame, TAN);
    for (let k = 0; k < RIM.length; k += 2) {
      const a = read(RIM, k) * radius;
      const b = read(RIM, k + 1) * radius;
      const [x = 0, y = 0, depth = 0] = framePoint(frame, z, a, b);
      const w = read(m, 3) * x + read(m, 7) * y + read(m, 11) * depth + read(m, 15);
      if (w < MIN_W) {
        behind += 1;
        continue;
      }
      const nx = (read(m, 0) * x + read(m, 4) * y + read(m, 8) * depth + read(m, 12)) / w;
      const ny = (read(m, 1) * x + read(m, 5) * y + read(m, 9) * depth + read(m, 13)) / w;
      minX = Math.min(minX, nx);
      maxX = Math.max(maxX, nx);
      minY = Math.min(minY, ny);
      maxY = Math.max(maxY, ny);
    }
  }
  if (behind === RIM.length) return 0;
  if (behind > 0) return 1;
  return (Math.max(0, clamp(maxX) - clamp(minX)) * Math.max(0, clamp(maxY) - clamp(minY))) / 4;
}
