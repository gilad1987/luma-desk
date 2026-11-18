import { aimAt } from '../domain/aim';
import type { Fixture } from '../domain/Fixture';
import type { PresetAim } from './presetAim';
import type { PresetFn } from './positionPresets';

/** The unit direction from the ring centre to a fixture in plan view, and its angle around the ring. */
function ringU(f: Fixture, ring: PresetAim['ring']): [ux: number, uz: number, angle: number] {
  const dx = f.pos.x - ring.x,
    dz = f.pos.z - ring.z,
    l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l, Math.atan2(dx, dz)];
}

function ringsOf({ deckY, ring }: PresetAim) {
  return {
    ringDown: (f) => (f.mount === 'floor' ? aimAt(f, f.pos.x, 40, f.pos.z) : aimAt(f, f.pos.x, deckY, f.pos.z)),
    ringCone: (f) => aimAt(f, ring.x, f.mount === 'floor' ? 34 : deckY, ring.z),
    ringSun: (f) => {
      const [ux, uz] = ringU(f, ring);
      return aimAt(f, f.pos.x + ux * 40, f.pos.y - 5, f.pos.z + uz * 40);
    },
    ringTwist: (f) => {
      const [, , a] = ringU(f, ring),
        b = a + 2.3;
      const y = f.mount === 'floor' ? 34 : deckY;
      return aimAt(f, ring.x + Math.sin(b) * ring.R * 0.9, y, ring.z + Math.cos(b) * ring.R * 0.9);
    },
    ringCrown: (f) => {
      const [ux, uz] = ringU(f, ring);
      return aimAt(f, f.pos.x + ux * 22, 70, f.pos.z + uz * 22);
    },
  } satisfies Record<string, PresetFn>;
}

/** The name of a ring preset; the first five position presets, in show-file order. */
export type RingPresetName = keyof ReturnType<typeof ringsOf>;

/**
 * The position presets that aim at or around the ring (and `ringDown`, which aims straight down to the deck). They are
 * apart from the other position presets because they share the ring geometry helper.
 */
export function ringPresetsOf(aim: PresetAim): Readonly<Record<RingPresetName, PresetFn>> {
  return ringsOf(aim);
}
