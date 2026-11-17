import type { BufferGeometry } from 'three';
import { merge } from '../modelGeometry';
import type { ModelPrimitives } from '../ModelPrimitives';

/** The Robe yoke: body-coloured arms and dark covers. */
export interface RobeYokeGeometry {
  readonly yoke: BufferGeometry;
  readonly yokeTrim: BufferGeometry;
}

/**
 * Thick U yoke whose arms sit at +-ax: bearing, cross-member, arms with rounded ends at the tilt axis, angled inner
 * corners, outer covers with grip lines.
 */
export function robeYokeGeometry({ box, cylinder, cylinderX }: ModelPrimitives, ax: number): RobeYokeGeometry {
  return {
    yoke: merge([
      cylinder([0, 0.02, 0], 0.2, 0.06),
      box([0, -0.03, 0], [ax * 2 + 0.12, 0.09, 0.34]),
      ...[-1, 1].flatMap((sx) => [
        box([sx * ax, -0.33, 0], [0.12, 0.62, 0.34]),
        cylinderX([sx * ax, -0.66, 0], 0.17, 0.12),
        box([sx * (ax - 0.04), -0.075, 0], [0.1, 0.1, 0.32], [0, 0, Math.PI / 4]),
        box([sx * (ax + 0.085), -0.28, 0], [0.05, 0.42, 0.28]),
      ]),
    ]),
    yokeTrim: merge(
      [-1, 1].flatMap((sx) => [
        cylinderX([sx * (ax + 0.075), -0.66, 0], 0.11, 0.03),
        ...[0, 1, 2].map((k) => box([sx * (ax + 0.112), -0.2, -0.06 + k * 0.06], [0.012, 0.12, 0.025])),
      ]),
    ),
  };
}
