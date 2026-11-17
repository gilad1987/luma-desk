import { beatsElapsed, type BeatClock } from './beatsElapsed';
import type { Performer } from './performerSpec';

/**
 * Moves the band and orchestra to the beat, once per frame: each performer bounces, sways about the up axis and nods,
 * offset by their own phase so the stage never moves in lock-step.
 */
export function animatePerformers(performers: readonly Performer[], now: number, tempo: BeatClock): void {
  const bf = beatsElapsed(now, tempo) * Math.PI * 2;
  for (const p of performers) {
    const b = Math.sin(bf + p.phase);
    p.body.position.y = p.baseY + Math.abs(b) * p.bounce;
    p.body.rotation.y = p.facing + Math.sin(bf * 0.25 + p.phase) * p.sway;
    p.head.rotation.x = b * 0.12;
  }
}
