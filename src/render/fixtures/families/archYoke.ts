import type { BufferGeometry } from 'three';
import type { YokedCanBody } from '../../../domain/fixtureProducts/FixtureProduct';
import { merge } from '../modelGeometry';
import type { ModelPrimitives } from '../ModelPrimitives';

/** The stand of a yoked can: the twin arch tubes with their top clamp plate, the side brackets and the T-knobs. */
export interface ArchGeometry {
  readonly arch: BufferGeometry;
  readonly knobs: BufferGeometry;
}

/** Straight segments that draw the half circle over the top of the arch. */
const ARC_STEPS = 10;
/** T-knob crossbar radius and length; the crossbar stands upright in the front view, as on the drawings. */
const KNOB_BAR = { r: 0.012, length: 0.12 };
/** Side bracket plate at each arch foot (x, y, z sizes): the upright plate behind the T-knob on the front drawing. */
const BRACKET = [0.05, 0.3, 0.1] as const;

/** The arch centre line in the XY plane: straight up from each pivot, then a half circle of `halfWidth` over the top. */
function archPath({ halfWidth, height }: YokedCanBody['arch']): (readonly [number, number])[] {
  const top = height - halfWidth;
  const arc = Array.from({ length: ARC_STEPS + 1 }, (_, k): readonly [number, number] => {
    const a = (k / ARC_STEPS) * Math.PI;
    return [halfWidth * Math.cos(a), top + halfWidth * Math.sin(a)];
  });
  return [[halfWidth, 0], ...arc, [-halfWidth, 0]];
}

/** The arch over the head and the pivot hardware at its feet, cut once per product from its numbers. */
export function archYoke(prims: ModelPrimitives, { arch, rim, knob }: YokedCanBody): ArchGeometry {
  const { box, cylinder, cylinderX } = prims;
  const path = archPath(arch);
  const tubes = [-1, 1].flatMap((sz) =>
    path.slice(1).map(([x1, y1], k) => {
      const [x0, y0] = path[k] ?? [x1, y1];
      const [dx, dy] = [x1 - x0, y1 - y0];
      const length = Math.hypot(dx, dy) + arch.tube; // the overlap closes the bends
      return cylinder([(x0 + x1) / 2, (y0 + y1) / 2, sz * arch.gap], arch.tube, length, [0, 0, Math.atan2(-dx, dy)]);
    }),
  );
  const plate = box([0, arch.height, 0], [0.12, 0.03, 2 * (arch.gap + arch.tube)]);
  const axle = knob - 2 * KNOB_BAR.r - rim.r;
  const knobs = [-1, 1].flatMap((sx) => [
    box([sx * arch.halfWidth, 0, 0], BRACKET),
    cylinderX([sx * (rim.r + axle / 2), 0, 0], 0.03, axle),
    cylinder([sx * (knob - KNOB_BAR.r), 0, 0], KNOB_BAR.r, KNOB_BAR.length),
  ]);
  return { arch: merge([...tubes, plate]), knobs: merge(knobs) };
}
