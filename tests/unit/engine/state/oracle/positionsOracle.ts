import { clamp, lerp } from '../../../../../src/core';
import { aimAt } from '../../../../../src/domain/aim';
import type { AttrValues } from '../../../../../src/domain/attributes';
import type { Fixture } from '../../../../../src/domain/Fixture';
import { BAND_PTS, DECK, RING, SCREEN } from '../../../../../src/domain/venue';

// Reference oracle: the original ringU 829, POS 830-854 and PFN 1568 from index.html at 48a3b63, formatted by
// Prettier. Changes: types only; BAND_PTS, RING, DECK, SCREEN and aimAt come from the domain (tested against the
// recorded original there).

type Fn = (f: Fixture, k: number, n: number) => AttrValues;

const ringU = (f: Fixture) => {
  const dx = f.pos.x - RING.x,
    dz = f.pos.z - RING.z,
    l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l, Math.atan2(dx, dz)] as [number, number, number];
};
const POS: Record<string, Fn> = {
  ringDown: (f) => (f.mount === 'floor' ? aimAt(f, f.pos.x, 40, f.pos.z) : aimAt(f, f.pos.x, DECK, f.pos.z)),
  ringCone: (f) => aimAt(f, RING.x, f.mount === 'floor' ? 34 : DECK, RING.z),
  ringSun: (f) => {
    const [ux, uz] = ringU(f);
    return aimAt(f, f.pos.x + ux * 40, f.pos.y - 5, f.pos.z + uz * 40);
  },
  ringTwist: (f) => {
    const [, , a] = ringU(f),
      b = a + 2.3;
    return aimAt(
      f,
      RING.x + Math.sin(b) * RING.R * 0.9,
      f.mount === 'floor' ? 34 : DECK,
      RING.z + Math.cos(b) * RING.R * 0.9,
    );
  },
  ringCrown: (f) => {
    const [ux, uz] = ringU(f);
    return aimAt(f, f.pos.x + ux * 22, 70, f.pos.z + uz * 22);
  },
  converge: (f) => aimAt(f, 0, 12, 42),
  wingFan: (f) => aimAt(f, f.pos.x * 3.2, 3, f.pos.z + 55),
  home: () => ({ pan: 0, tilt: 0 }),
  straight: () => ({ pan: 0, tilt: 0 }),
  center: (f) => aimAt(f, f.pos.x * 0.6, DECK, -9 + (f.pos.z + 9) * 0.25),
  singer: (f) => aimAt(f, 0, DECK + 1.5, -3.2),
  drums: (f) => aimAt(f, 0, DECK + 1.7, -13.2),
  down: (f) => aimAt(f, f.pos.x * 0.55, DECK, -1.2),
  audience: (f) => aimAt(f, clamp(f.pos.x * 1.6, -38, 38), 1.2, 30),
  fanAud: (f, k, n) => aimAt(f, lerp(-60, 60, n > 1 ? k / (n - 1) : 0.5), 1, 42),
  crowd: (f, k, n) =>
    f.pos.z > 20
      ? aimAt(f, f.pos.x * 0.45, 1.2, [18, 30, 46][k % 3] as number)
      : aimAt(f, lerp(-36, 36, n > 1 ? k / (n - 1) : 0.5), 1.2, 14 + (k % 3) * 12),
  skyFan: (f, k, n) =>
    f.mount === 'floor'
      ? aimAt(f, lerp(-45, 45, n > 1 ? k / (n - 1) : 0.5), 60, f.pos.z + 12)
      : aimAt(f, lerp(-60, 60, n > 1 ? k / (n - 1) : 0.5), 30, 70),
  cross: (f) => aimAt(f, -f.pos.x * 0.9, DECK, f.pos.z < -12 ? -5 : -9),
  screen: (f) => aimAt(f, f.pos.x * 0.75, DECK + 5, SCREEN.z),
  vOut: (f) => (f.mount === 'floor' ? aimAt(f, f.pos.x * 4, 40, f.pos.z) : aimAt(f, f.pos.x * 2.5, DECK, f.pos.z + 6)),
  band: (f, k) => {
    const P = BAND_PTS[k % BAND_PTS.length] as (typeof BAND_PTS)[number];
    return aimAt(f, P[0], DECK + 1.3 + (P[2] || 0), P[1]);
  },
  orch: (f, k) => {
    const sx = f.pos.x < 0 ? -1 : f.pos.x > 0 ? 1 : k % 2 ? 1 : -1;
    return aimAt(f, sx * (16.4 + ((k % 3) - 1) * 2.1), DECK + 1.6, -11.6 + ((k % 3) - 1) * 2.4);
  },
  tunnel: (f) => aimAt(f, 0, f.mount === 'floor' ? 40 : DECK, 40),
};
export const PFN_ORACLE: Record<string, Fn> = {
  ...POS,
  zMin: (f) => ({ zoom: f.T.zr[0] }),
  zMid: (f) => ({ zoom: (f.T.zr[0] + f.T.zr[1]) / 2 }),
  zMax: (f) => ({ zoom: f.T.zr[1] }),
};
