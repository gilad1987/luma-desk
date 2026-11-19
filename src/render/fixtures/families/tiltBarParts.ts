import type { BufferGeometry } from 'three';
import type { TiltBarBody } from '../../../domain/fixtureProducts/FixtureProduct';
import { merge } from '../modelGeometry';
import type { ModelPrimitives } from '../ModelPrimitives';
import { rounded } from './roundedBox';

/** Handle width beyond each end of the base body, model units (414 - 340 mm over two ends, UM p32). */
const HANDLE = 0.072;
const ENDS = [-1, 1];

/** The base: body, trim (feet, end handles, fan rings) and vents (front fin grilles, end fans). */
export interface TiltBarBaseGeometry {
  readonly base: BufferGeometry;
  readonly baseTrim: BufferGeometry;
  readonly baseVent: BufferGeometry;
}

/** The panning yoke: crossbar and arms, trim (front recess, pan bearing, hub caps) and the logo plate. */
export interface TiltBarYokeGeometry {
  readonly yoke: BufferGeometry;
  readonly yokeTrim: BufferGeometry;
  readonly logo: BufferGeometry;
}

/** The base box between the yoke and the feet: y of its centre, its height, its width without handles, foot height. */
export function baseBox({ base }: TiltBarBody): Readonly<Record<'y' | 'h' | 'w' | 'foot', number>> {
  const foot = base.h * 0.08;
  return { y: base.y - (base.h + foot) / 2, h: base.h - foot, w: base.w - 2 * HANDLE, foot };
}

/** The low rounded base of the hang orientation (on top, its feet up). */
export function baseParts(prims: ModelPrimitives, body: TiltBarBody): TiltBarBaseGeometry {
  const { box, cylinderX } = prims;
  const { y, h, w, foot } = baseBox(body);
  const { base } = body;
  const handle = (sx: number, sz: number): BufferGeometry[] =>
    rounded(prims, 'z', {
      at: [sx * (w / 2 + HANDLE / 2), y + h * 0.2, sz * 0.13],
      size: [HANDLE, 0.053, 0.06],
      r: 0.02,
    });
  return {
    base: merge(rounded(prims, 'z', { at: [0, y, 0], size: [w, h, base.d], r: 0.07 })),
    baseTrim: merge([
      ...ENDS.flatMap((sx) =>
        ENDS.map((sz) => box([sx * (w / 2 - 0.07), base.y - foot / 2, sz * 0.14], [0.08, foot, 0.06])),
      ),
      ...ENDS.flatMap((sx) => ENDS.flatMap((sz) => handle(sx, sz))),
      ...ENDS.map((sx) => cylinderX([sx * (w / 2 + 0.002), y, 0], 0.068, 0.004)),
    ]),
    baseVent: merge([
      ...ENDS.flatMap((sx) =>
        [0, 1, 2, 3, 4, 5].map((i) =>
          box([sx * (w / 2 - 0.08), y - h * 0.3 + i * 0.024, base.d / 2 + 0.003], [0.1, 0.008, 0.006]),
        ),
      ),
      ...ENDS.map((sx) => cylinderX([sx * (w / 2 + 0.003), y, 0], 0.055, 0.006)),
    ]),
  };
}

/** One yoke arm at `x`, seen from the end a paddle: a round hub on the tilt axis, a narrow neck, a flare to the bar. */
function armParts({ box, cylinderX }: ModelPrimitives, x: number, { yoke }: TiltBarBody): BufferGeometry[] {
  const neckTop = yoke.y * 0.55,
    dy = yoke.y - neckTop,
    dz = (yoke.d - yoke.neck) / 2,
    len = Math.hypot(dy, dz),
    t = (dz * dy) / len,
    tilt = Math.atan2(dz, dy);
  return [
    cylinderX([x, 0, 0], yoke.neck * 0.9, yoke.arm),
    box([x, yoke.y / 2, 0], [yoke.arm, yoke.y, yoke.neck]),
    ...ENDS.map((sz) => {
      const my = (neckTop + yoke.y) / 2 + ((t / 2) * dz) / len,
        mz = sz * ((yoke.neck + yoke.d) / 4 - ((t / 2) * dy) / len);
      return box([x, my, mz], [yoke.arm, len, t], [sz * tilt, 0, 0]);
    }),
  ];
}

/** The yoke: a crossbar as long as the bar between the base and the head, with an arm at each end. */
export function yokeParts(prims: ModelPrimitives, body: TiltBarBody): TiltBarYokeGeometry {
  const { box, cylinder, cylinderX } = prims;
  const { yoke, head, base } = body;
  const half = head.w / 2 + yoke.arm,
    mid = yoke.y + yoke.h / 2,
    gap = [yoke.y + yoke.h, base.y - base.h] as const;
  return {
    yoke: merge([
      ...rounded(prims, 'x', { at: [0, mid, 0], size: [2 * half, yoke.h, yoke.d], r: 0.03 }),
      ...ENDS.flatMap((sx) => armParts(prims, sx * (half - yoke.arm / 2), body)),
    ]),
    yokeTrim: merge([
      box([0, mid, yoke.d / 2 + 0.002], [2 * half * 0.84, yoke.h * 0.6, 0.004]),
      cylinder([0, (gap[0] + gap[1]) / 2, 0], 0.1, gap[1] - gap[0] + 0.004),
      ...ENDS.map((sx) => cylinderX([sx * (half - 0.003), 0, 0], yoke.neck * 0.5, 0.006)),
    ]),
    logo: box([0, mid, yoke.d / 2 + 0.005], [0.17, 0.04, 0.004]),
  };
}
