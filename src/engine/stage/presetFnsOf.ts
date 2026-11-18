import type { StageFrame } from '../../domain/stage/StageFrame';
import type { PresetAim } from '../presetAim';
import { presetFnsAimedAt, type PresetFnName } from '../presetFunctions';
import type { PresetFn } from '../positionPresets';

/**
 * The aim numbers of a stage. A part the stage lacks is replaced by the deck centre (the ring with radius 0, the screen
 * plane through it, one band mark on it), so a preset whose target is missing still returns finite values: the pool
 * hides such a preset (G10), but Auto Show keeps its preset lists unchanged for the random parity and may call it.
 */
function aimOf(frame: StageFrame): PresetAim {
  const { deck } = frame;
  const x = (deck.x0 + deck.x1) / 2;
  const z = (deck.z0 + deck.z1) / 2;
  return {
    deckY: deck.height,
    ring: frame.ring ?? { x, z, R: 0 },
    screenZ: frame.screen?.z ?? z,
    band: frame.bandPoints.length > 0 ? frame.bandPoints : [[x, z, 0]],
  };
}

/**
 * Every computed preset aimed at the stage of `frame`; for the built-in frame the values equal `PRESET_FNS`. It never
 * throws for a missing stage part (see `aimOf`). Builds new functions on each call, so callers on a hot path keep the
 * result until the next `rigChanged`.
 */
export function presetFnsOf(frame: StageFrame): Readonly<Record<PresetFnName, PresetFn>> {
  return presetFnsAimedAt(aimOf(frame));
}
