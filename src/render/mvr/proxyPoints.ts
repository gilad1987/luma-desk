import type { StageDesign } from '../../domain/stage/StageDesign';
import type { StageBounds, Vec3 } from '../../domain/stage/types';
import { pointToThree, type MvrGeometry, type Point3 } from '../../mvr/index';

/** The top of a drawn seat over its point (m): the back of the chair shape (`proxyGeometry`). */
const SEAT_TOP = 0.85;

/** A translation of an MVR matrix (millimetres, Z up) in the fitted three frame: the axis change, then the fit offset. */
function fitted(m: ArrayLike<number>, offset: Vec3): Point3 {
  const [x, y, z] = pointToThree([m[12] ?? 0, m[13] ?? 0, m[14] ?? 0]);
  return [x + offset[0], y + offset[1], z + offset[2]];
}

/**
 * Where the drawn seat and LED-panel proxies stand, in the fitted three frame, as `proxies.ts` places them: the
 * translation of T(offset)·toThree(frame). Every proxy on a shown layer counts, so what is on screen is in the
 * camera box. A layer that lies far from the rest of the file as a whole starts hidden (`importProxies`) and is left
 * out as a hidden layer; a layer with a far part that is shown, a main wall with a side screen far off, is in.
 */
export function proxyPoints(design: StageDesign, geometry: MvrGeometry): Point3[] {
  return shown(design, geometry, (kind) => kind !== 'unknown').map(({ point }) => point);
}

/** The drawn seats among `proxyPoints`: the views cluster them to find the house of the stage (`seatCluster`). */
export function seatPoints(design: StageDesign, geometry: MvrGeometry): Point3[] {
  return shown(design, geometry, (kind) => kind === 'seat').map(({ point }) => point);
}

/** The drawn panels among `proxyPoints`: every proxy that is not a seat. */
export function panelPoints(design: StageDesign, geometry: MvrGeometry): Point3[] {
  return shown(design, geometry, (kind) => kind !== 'unknown' && kind !== 'seat').map(({ point }) => point);
}

/**
 * The boxes of the drawn proxies, for the clear zone of a camera eye (`clearEye`). A seat stands on its point, one
 * pitch wide and `SEAT_TOP` high. A panel is taken as a cube of its pitch about its point, whichever way it faces:
 * the eye keeps off it on every side. A proxy with a broken matrix has no box.
 */
export function proxyBoxes(design: StageDesign, geometry: MvrGeometry): StageBounds[] {
  return shown(design, geometry, (kind) => kind !== 'unknown').flatMap(({ point: [x, y, z], kind, half }) => {
    const [low, high] = kind === 'seat' ? [y, y + SEAT_TOP] : [y - half, y + half];
    const box: StageBounds = { min: [x - half, low, z - half], max: [x + half, high, z + half] };
    return [...box.min, ...box.max].every(Number.isFinite) ? [box] : [];
  });
}

/** A drawn proxy of a shown layer: where it stands, its kind and half its pitch (m). */
interface Shown {
  readonly point: Point3;
  readonly kind: string;
  readonly half: number;
}

function shown(design: StageDesign, geometry: MvrGeometry, wanted: (kind: string) => boolean): Shown[] {
  const skip = new Set(design.mvr?.hiddenLayers ?? []);
  return (geometry.proxies ?? []).flatMap(({ kind, frame, pitch, layer }) =>
    !wanted(kind) || !frame || pitch === undefined || skip.has(layer)
      ? []
      : [{ point: fitted(frame, geometry.offset), kind, half: pitch / 2000 }],
  );
}

/** `box` grown to hold `points`. A point that is not finite (a broken matrix in the file) would make the box, and so
 * every camera view and the hall light, NaN or endless, so it is left out. */
export function withPoints(box: StageBounds, points: readonly Point3[]): StageBounds {
  const min = [box.min[0], box.min[1], box.min[2]];
  const max = [box.max[0], box.max[1], box.max[2]];
  for (const point of points) {
    if (!point.every(Number.isFinite)) continue;
    point.forEach((value, i) => {
      min[i] = Math.min(min[i] ?? value, value);
      max[i] = Math.max(max[i] ?? value, value);
    });
  }
  const [x0 = 0, y0 = 0, z0 = 0] = min;
  const [x1 = 0, y1 = 0, z1 = 0] = max;
  return { min: [x0, y0, z0], max: [x1, y1, z1] };
}
