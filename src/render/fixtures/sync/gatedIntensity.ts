import { clamp } from '../../../core';
import type { AttrValues } from '../../../domain/attributes';
import { outputValue } from './BeamFrame';

/**
 * The output dimmer behind the strobe shutter, 0..1: the shutter is open 22 % of each period, at 1 to 23 Hz. Every
 * fixture's frame update starts from it, the screen's as well as the lights'.
 */
export function gatedIntensity(o: Readonly<AttrValues>, now: number): number {
  let intensity = clamp(outputValue(o, 'dim') / 100, 0, 1);
  const strobe = outputValue(o, 'strobe');
  if (strobe > 0.5) {
    const hz = 1 + (strobe / 100) * 22;
    intensity *= (now * hz) % 1 < 0.22 ? 1 : 0;
  }
  return intensity;
}
