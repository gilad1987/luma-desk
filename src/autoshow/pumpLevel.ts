import type { PulseSource } from './AutoSettings';

/**
 * The beat pump factor on the auto executor's beams and spots. `beat` mode decays from full at each beat; `audio`
 * mode follows the song's bass, squared for punch, and reads the analyser only when one exists (`bassLevel` returns
 * null otherwise, and the pump stays at 1). The bass is read only in `audio` mode because each read moves its peak.
 */
export function pumpLevel(pulse: PulseSource, beatPhase: number, bassLevel: () => number | null): number {
  if (pulse === 'beat') return 0.45 + 0.55 * Math.exp(-beatPhase * 5);
  const bass = pulse === 'audio' ? bassLevel() : null;
  return bass === null ? 1 : 0.2 + 0.8 * bass * bass;
}
