import type { BufferGeometry } from 'three';
import { merge } from '../modelGeometry';
import type { ModelPrimitives } from '../ModelPrimitives';

/** The base all Robe moving heads share: body and dark trim. */
export interface RobeBaseGeometry {
  readonly body: BufferGeometry;
  readonly trim: BufferGeometry;
}

/** Rounded base with recessed side handles, feet and the truss clamp. */
export function robeBaseGeometry({ box, cylinder }: ModelPrimitives): RobeBaseGeometry {
  return {
    body: merge([
      box([0, 0.83, 0], [0.84, 0.26, 0.7]),
      box([0, 0.83, 0], [1.0, 0.26, 0.54]),
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cylinder([sx * 0.42, 0.83, sz * 0.27], 0.08, 0.26))),
    ]),
    trim: merge([
      ...[-1, 1].map((sx) => box([sx * 0.505, 0.83, 0], [0.03, 0.08, 0.42])),
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cylinder([sx * 0.38, 0.975, sz * 0.24], 0.045, 0.03))),
      box([0, 0.985, 0], [0.62, 0.03, 0.12]),
      cylinder([0, 1.03, 0], 0.09, 0.12),
    ]),
  };
}
