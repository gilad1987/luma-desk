import type { BufferGeometry } from 'three';
import type { TrussParams, TrussPart } from '../../../domain/stage/trussTypes';
import type { Vec3 } from '../../../domain/stage/types';
import { bar, boxSpan } from './boxGeometry';

/** Straight bars per circle truss; 24 keeps the ring round to the eye at stage distance. */
const CIRCLE_SEGMENTS = 24;
/** Bar width of a roof frame, whose params carry no section: a common 30 cm box truss. */
const ROOF_SECTION = 0.3;

const partBox = ({ size, at }: TrussPart): BufferGeometry =>
  boxSpan(
    [at[0] - size[0] / 2, at[1] - size[1] / 2, at[2] - size[2] / 2],
    [at[0] + size[0] / 2, at[1] + size[1] / 2, at[2] + size[2] / 2],
  );

function circleBars(radius: number, section: number): BufferGeometry[] {
  const point = (index: number): Vec3 => {
    const angle = (index / CIRCLE_SEGMENTS) * Math.PI * 2;
    return [radius * Math.cos(angle), 0, radius * Math.sin(angle)];
  };
  return Array.from({ length: CIRCLE_SEGMENTS }, (_, index) => bar(point(index), point(index + 1), section));
}

/** Two posts on the base line at ±width/2 and the cross bar on top. */
function goalpostBars(width: number, height: number, section: number): BufferGeometry[] {
  const [left, right] = [-width / 2, width / 2];
  const leftTop: Vec3 = [left, height, 0];
  const rightTop: Vec3 = [right, height, 0];
  return [bar([left, 0, 0], leftTop, section), bar([right, 0, 0], rightTop, section), bar(leftTop, rightTop, section)];
}

/** Four legs and four top bars of a roof box centred on its position. */
function roofBars([x, y, z]: Vec3): BufferGeometry[] {
  const corners: Vec3[] = [
    [-x / 2, 0, -z / 2],
    [x / 2, 0, -z / 2],
    [x / 2, 0, z / 2],
    [-x / 2, 0, z / 2],
  ];
  const low = (c: Vec3): Vec3 => [c[0], -y / 2, c[2]];
  const high = (c: Vec3): Vec3 => [c[0], y / 2, c[2]];
  const legs = corners.map((corner) => bar(low(corner), high(corner), ROOF_SECTION));
  const tops = corners.map((corner, index) =>
    bar(high(corner), high(corners[(index + 1) % 4] ?? corner), ROOF_SECTION),
  );
  return [...legs, ...tops];
}

/**
 * The boxes of a truss in its local frame, by the same anchors as the stage bounds (`domain/stage/bounds.ts`): a line
 * from `a` to `b` with its parts, a flat circle around the centre, a goalpost on its base centre and a roof box
 * centred on its position. Plain boxes stand in for the app's truss builders until the export uses those.
 */
export function trussBoxes(params: TrussParams): BufferGeometry[] {
  switch (params.kind) {
    case 'straight':
    case 'tower':
      return [bar(params.a, params.b, params.section), ...(params.parts ?? []).map(partBox)];
    case 'circle':
      return circleBars(params.radius, params.section);
    case 'goalpost':
      return goalpostBars(params.width, params.height, params.section);
    case 'roof':
      return roofBars(params.size);
  }
}
