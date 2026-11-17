import { beatsElapsed, type BeatClock } from './beatsElapsed';
import type { CrowdBounceUniforms } from './crowdBounce';

/**
 * Writes the crowd bounce uniforms for this frame. `jump` scales the jumps; the frame loop computes it from the
 * auto-show (audio pulse mode lowers it to follow the music), which the venue must not import.
 */
export function animateCrowd(uniforms: CrowdBounceUniforms, now: number, tempo: BeatClock, jump: number): void {
  uniforms.uBeat.value = beatsElapsed(now, tempo) * Math.PI;
  uniforms.uJump.value = jump;
}
