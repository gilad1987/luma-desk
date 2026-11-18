import { hash, hsv } from '../core';
import type { PhaserType } from './shared';

/**
 * One phaser's contribution to one fixture: pan/tilt offsets in degrees, a dimmer level and an RGB colour (0-100).
 * A shape writes only the fields of its feature, so the merger reads only those.
 */
export interface FxSample {
  dp: number;
  dt: number;
  dim: number;
  r: number;
  g: number;
  b: number;
}

/** Where a phaser is in its cycle: `ph` in radians, `tb` seconds since the beat origin, `freq` in cycles per second. */
export interface PhaserPhase {
  readonly ph: number;
  readonly tb: number;
  readonly freq: number;
}

/** Writes one shape's wave into `out`; only the random flash reads `fixtureId`. */
type ShapeWriter = (S: number, phase: PhaserPhase, fixtureId: number, out: FxSample) => void;

/** One writer per phaser type; the Record type makes a new phaser type fail to compile until it has its shape. */
const SHAPES: Readonly<Record<PhaserType, ShapeWriter>> = {
  circle: (S, { ph }, _fixtureId, out) => {
    out.dp = S * Math.sin(ph);
    out.dt = S * Math.cos(ph);
  },
  pan: (S, { ph }, _fixtureId, out) => {
    out.dp = S * Math.sin(ph);
  },
  tilt: (S, { ph }, _fixtureId, out) => {
    out.dt = S * Math.sin(ph);
  },
  bally: (S, { ph }, _fixtureId, out) => {
    out.dp = S * Math.sin(ph);
    out.dt = S * 0.6 * Math.sin(2 * ph + 1);
  },
  dimSine: (S, { ph }, _fixtureId, out) => {
    out.dim = S * (0.5 + 0.5 * Math.sin(ph));
  },
  dimChase: (S, { ph }, _fixtureId, out) => {
    out.dim = S * Math.pow(0.5 + 0.5 * Math.cos(ph), 10);
  },
  dimSaw: (S, { ph }, _fixtureId, out) => {
    const x = (((ph / (Math.PI * 2)) % 1) + 1) % 1;
    out.dim = S * Math.pow(1 - x, 3);
  },
  flash: (S, { tb, freq }, fixtureId, out) => {
    // 16 random steps per cycle; a step is lit for its first 35 % when its hash for this fixture is in the top 18 %
    const step = Math.floor(tb * freq * 16),
      fr = tb * freq * 16 - step;
    out.dim = hash(step * 13.7 + fixtureId * 3.1) > 0.82 && fr < 0.35 ? S : 0;
  },
  rainbow: (S, { ph }, _fixtureId, out) => {
    const c = hsv((((ph / (Math.PI * 2)) % 1) + 1) % 1, 1, 1);
    out.r = c[0] * 100;
    out.g = c[1] * 100;
    out.b = c[2] * 100;
  },
  rgbChase: (_S, { ph }, _fixtureId, out) => {
    const k = ((Math.floor((ph / (Math.PI * 2)) * 3) % 3) + 3) % 3;
    out.r = k === 0 ? 100 : 0;
    out.g = k === 1 ? 100 : 0;
    out.b = k === 2 ? 100 : 0;
  },
};

/**
 * The lookup the frame uses. The type string comes from a saved show and may name no shape; then nothing is written,
 * as in the original desk, where no `switch` case matched.
 */
const SHAPE_BY_TYPE: ReadonlyMap<string, ShapeWriter> = new Map(Object.entries(SHAPES));

/**
 * Writes the wave of phaser `type` at `phase` into `out`. The arithmetic is written exactly as in the original desk:
 * output goldens compare bit for bit, so no expression may be reordered or factored out.
 */
// eslint-disable-next-line @typescript-eslint/max-params -- per-frame path: an options object would allocate per call
export function shapePhaser(type: PhaserType, S: number, phase: PhaserPhase, fixtureId: number, out: FxSample): void {
  SHAPE_BY_TYPE.get(type)?.(S, phase, fixtureId, out);
}
