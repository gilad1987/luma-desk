// Copied from index.base.html 1582-1609 (FXT, fxEval, rebuildProgFx); bpm/beatOrigin/prog come from `env`.
import { hash, hsv } from '../../../../../src/core';
import type { Fixture } from '../../../../../src/domain/Fixture';
import type { LegacyEnv } from './legacyEnv';
import type { LRef } from './legacyTypes';

export const FXT: Record<string, { name: string; feat: string; size: number }> = {
  circle: { name: 'Circle', feat: 'pos', size: 22 },
  pan: { name: 'Pan Sweep', feat: 'pos', size: 40 },
  tilt: { name: 'Tilt Bounce', feat: 'pos', size: 28 },
  bally: { name: 'Ballyhoo', feat: 'pos', size: 32 },
  dimSine: { name: 'Dim Wave', feat: 'dim', size: 100 },
  dimChase: { name: 'Dim Chase', feat: 'dim', size: 100 },
  dimSaw: { name: 'Swipe', feat: 'dim', size: 100 },
  flash: { name: 'Random Flash', feat: 'dim', size: 100 },
  rainbow: { name: 'Rainbow', feat: 'color', size: 100 },
  rgbChase: { name: 'Color Chase', feat: 'color', size: 100 },
};
export type LSample = Record<string, number>;

export function fxEval(env: LegacyEnv, ref: LRef, f: Fixture, now: number, out: LSample): void {
  const I = ref.inst;
  const freq = (env.bpm / 60 / 4) * I.rate;
  const tb = now - env.beatOrigin;
  const ph = (tb * freq + (I.spread / 360) * (ref.n > 1 ? ref.idx / ref.n : 0)) * Math.PI * 2;
  const S = I.size;
  switch (I.type) {
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
      const step = Math.floor(tb * freq * 16),
        fr = tb * freq * 16 - step;
      out.dim = hash(step * 13.7 + f.id * 3.1) > 0.82 && fr < 0.35 ? S : 0;
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

export function rebuildProgFx(env: LegacyEnv): void {
  const prog = env.prog;
  prog.fx = {};
  for (const inst of prog.fxList) {
    const feat = FXT[inst.type]?.feat ?? '';
    inst.ids.forEach((id, idx) => (prog.fx[id + '|' + feat] = { inst, idx, n: inst.ids.length }));
  }
}
