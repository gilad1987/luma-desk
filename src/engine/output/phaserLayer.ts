import type { Fixture } from '../../domain/Fixture';
import { evalPhaser, type TempoReading } from '../Phaser';
import type { FxSample } from '../phaserShapes';
import { PHASER_FEATURES, type PhaserSlots } from './PhaserSlots';
import type { AttrOutput } from './resetOutput';

/**
 * Applies the winning phasers to fixture `f`. A position phaser adds to pan/tilt on moving fixtures and ignores the
 * level; a dimmer phaser replaces the dimmer (scaled by its executor's level); a colour phaser replaces RGB. `sample`
 * is scratch space reused across fixtures to avoid an allocation per phaser.
 */
// eslint-disable-next-line @typescript-eslint/max-params -- per-frame path: an options object would allocate per fixture
export function applyPhasers(
  f: Fixture,
  o: AttrOutput,
  slots: PhaserSlots,
  now: number,
  tempo: TempoReading,
  sample: FxSample,
): void {
  for (const ft of PHASER_FEATURES) {
    const s = slots[ft];
    if (!s) continue;
    sample.dp = sample.dt = 0;
    evalPhaser(s.r, f.id, now, tempo, sample);
    if (ft === 'pos' && f.T.moving) {
      o.pan += sample.dp;
      o.tilt += sample.dt;
    }
    if (ft === 'dim' && f.has('dim')) o.dim = sample.dim * s.lv;
    if (ft === 'color' && f.has('r')) {
      o.r = sample.r;
      o.g = sample.g;
      o.b = sample.b;
    }
  }
}
