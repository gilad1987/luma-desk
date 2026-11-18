import type { Camera } from 'three';
import { read } from './beamFrame';
import type { CasterParts } from './casterParts';

/**
 * Numbers in the volume of a tile: six planes (a normal and an offset each; a point p is inside when n.p + d >= 0),
 * then the cone of the light: the apex, the axis, and the sine and cosine of its half angle.
 */
export const VOLUME = 32;
const CONE = 24;
const BOX = 6;

/**
 * Writes the volume that the tile camera sees into `out`, from the matrices `aimTileCamera` wrote. The frustum is a
 * square around the cone of the light plus the tile margin; a beam sample never reads the corners of the square,
 * so a caster that is only there is not drawn.
 */
export function tileVolume(camera: Camera, out: Float64Array): void {
  const e = camera.matrixWorld.elements;
  const p = camera.projectionMatrix.elements;
  const tanX = 1 / read(p, 0);
  const tanY = 1 / read(p, 5);
  for (let i = 0; i < 3; i++) {
    // the camera looks along its -z
    const axis = -read(e, 8 + i);
    out[i] = axis * tanX - read(e, i);
    out[4 + i] = axis * tanX + read(e, i);
    out[8 + i] = axis * tanY - read(e, 4 + i);
    out[12 + i] = axis * tanY + read(e, 4 + i);
    out[16 + i] = axis;
    out[20 + i] = -axis;
    out[CONE + i] = read(e, 12 + i);
    out[CONE + 3 + i] = axis;
  }
  // all six planes through the eye, then near and far moved along the axis
  for (let k = 0; k < CONE; k += 4) {
    out[k + 3] = -(read(out, k) * read(e, 12) + read(out, k + 1) * read(e, 13) + read(out, k + 2) * read(e, 14));
  }
  out[19] = read(out, 19) - read(p, 14) / (read(p, 10) - 1);
  out[23] = read(out, 23) + read(p, 14) / (read(p, 10) + 1);
  const tan = Math.max(tanX, tanY);
  const cos = 1 / Math.sqrt(1 + tan * tan);
  out[CONE + 6] = tan * cos;
  out[CONE + 7] = cos;
}

/**
 * True when the box at `at` in `boxes` (min x, y, z, max x, y, z; world space) may be in the volume. Each plane is
 * tested against the corner of the box that is farthest inside it, so a box is never missed; then the sphere around
 * the box is tested against the cone. It allocates nothing: it runs for every chunk of every tile draw.
 */
export function boxInTile(volume: Float64Array, boxes: ArrayLike<number>, at: number): boolean {
  const x0 = read(boxes, at);
  const y0 = read(boxes, at + 1);
  const z0 = read(boxes, at + 2);
  const x1 = read(boxes, at + 3);
  const y1 = read(boxes, at + 4);
  const z1 = read(boxes, at + 5);
  for (let k = 0; k < CONE; k += 4) {
    const nx = read(volume, k);
    const ny = read(volume, k + 1);
    const nz = read(volume, k + 2);
    const inside = nx * (nx >= 0 ? x1 : x0) + ny * (ny >= 0 ? y1 : y0) + nz * (nz >= 0 ? z1 : z0);
    if (inside + read(volume, k + 3) < 0) return false;
  }
  const cx = (x0 + x1) / 2 - read(volume, CONE);
  const cy = (y0 + y1) / 2 - read(volume, CONE + 1);
  const cz = (z0 + z1) / 2 - read(volume, CONE + 2);
  const along = cx * read(volume, CONE + 3) + cy * read(volume, CONE + 4) + cz * read(volume, CONE + 5);
  const off = Math.sqrt(Math.max(0, cx * cx + cy * cy + cz * cz - along * along));
  const radius = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2 + (z1 - z0) ** 2) / 2;
  // the distance from the centre to the side of the cone, which is not less than this, against the radius
  return off * read(volume, CONE + 7) - along * read(volume, CONE + 6) <= radius;
}

/** Shows the objects `from` to `to` of a caster set that the volume may hold, and hides the others. */
export function showInTile(volume: Float64Array, parts: CasterParts, from: number, to: number): void {
  for (let i = from; i < to; i++) {
    const object = parts.objects[i];
    if (object) object.visible = boxInTile(volume, parts.boxes, i * BOX);
  }
}

/**
 * The triangles a tile draws from the caster sets, as a share of all their triangles. It is the measure of the
 * culling: the depth pass costs what it draws. A triangle that is in two drawn cells counts twice, as it is drawn.
 */
export function drawnShare(
  volume: Float64Array,
  sets: readonly Pick<CasterParts, 'boxes' | 'counts' | 'triangles'>[],
): number {
  let drawn = 0;
  let all = 0;
  for (const { boxes, counts, triangles } of sets) {
    all += triangles;
    for (let i = 0; i < counts.length; i++) if (boxInTile(volume, boxes, i * BOX)) drawn += read(counts, i);
  }
  return all > 0 ? drawn / all : 0;
}
