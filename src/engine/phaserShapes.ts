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

/**
 * Writes the wave of phaser `type` at `phase` into `out`. The arithmetic is written exactly as in the original desk:
 * output goldens compare bit for bit, so no expression may be reordered or factored out.
 */
export function shapePhaser(type: PhaserType, S: number, phase: PhaserPhase, fixtureId: number, out: FxSample): void {
  const { ph, tb, freq } = phase;
  switch (type) {
    case 'circle':
      out.dp = S * Math.sin(ph);
      out.dt = S * Math.cos(ph);
      break;
    case 'pan':
      out.dp = S * Math.sin(ph);
      break;
    case 'tilt':
      out.dt = S * Math.sin(ph);
      break;
    case 'bally':
      out.dp = S * Math.sin(ph);
      out.dt = S * 0.6 * Math.sin(2 * ph + 1);
      break;
    case 'dimSine':
      out.dim = S * (0.5 + 0.5 * Math.sin(ph));
      break;
    case 'dimChase':
      out.dim = S * Math.pow(0.5 + 0.5 * Math.cos(ph), 10);
      break;
    case 'dimSaw': {
      const x = (((ph / (Math.PI * 2)) % 1) + 1) % 1;
      out.dim = S * Math.pow(1 - x, 3);
      break;
    }
    case 'flash': {
      // 16 random steps per cycle; a step is lit for its first 35 % when its hash for this fixture is in the top 18 %
      const step = Math.floor(tb * freq * 16),
        fr = tb * freq * 16 - step;
      out.dim = hash(step * 13.7 + fixtureId * 3.1) > 0.82 && fr < 0.35 ? S : 0;
      break;
    }
    case 'rainbow': {
      const c = hsv((((ph / (Math.PI * 2)) % 1) + 1) % 1, 1, 1);
      out.r = c[0] * 100;
      out.g = c[1] * 100;
      out.b = c[2] * 100;
      break;
    }
    case 'rgbChase': {
      const k = ((Math.floor((ph / (Math.PI * 2)) * 3) % 3) + 3) % 3;
      out.r = k === 0 ? 100 : 0;
      out.g = k === 1 ? 100 : 0;
      out.b = k === 2 ? 100 : 0;
      break;
    }
  }
}
