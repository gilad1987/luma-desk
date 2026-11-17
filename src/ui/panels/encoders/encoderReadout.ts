import type { Fixture } from '../../../domain/Fixture';
import type { Programmer } from '../../../engine/Programmer';
import { isPhaserParam, type EncoderAttr } from './encoderSpec';

/** What one encoder shows: the value (null = nothing to read), whether the programmer holds it, and if it applies. */
export interface EncoderReadout {
  readonly value: number | null;
  readonly programmed: boolean;
  readonly enabled: boolean;
}

const NOTHING: EncoderReadout = { value: null, programmed: false, enabled: false };

/**
 * Reads an encoder's value from the first selected fixture that has the attribute (its programmer value, else its
 * base), or from the selection's first phaser; a phaser value always counts as programmed.
 */
export function encoderReadout(
  attr: EncoderAttr,
  selected: readonly Fixture[],
  programmer: Programmer,
): EncoderReadout {
  if (isPhaserParam(attr)) {
    const phaser = programmer.phasersOnSelection()[0];
    return phaser ? { value: phaser[attr], programmed: true, enabled: true } : NOTHING;
  }
  const f = selected.find((s) => s.has(attr));
  if (!f) return NOTHING;
  const pv = programmer.vals[f.id]?.[attr];
  if (pv != null) return { value: pv, programmed: true, enabled: true };
  return { value: f.base[attr] ?? null, programmed: false, enabled: true };
}
