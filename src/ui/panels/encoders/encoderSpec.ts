import { ATTR, type AttrName } from '../../../domain/attributes';
import type { PhaserInstance } from '../../../engine/shared';
import type { EncoderRange } from '../../components/EncoderTurn';

/** The phaser parameters the Phaser tab turns, on every phaser of the selection. */
export type PhaserParam = keyof Pick<PhaserInstance, 'rate' | 'size' | 'spread'>;

/** Anything an encoder can turn: a fixture attribute or a phaser parameter. */
export type EncoderAttr = AttrName | PhaserParam;

/** A turnable range plus the unit its readout shows. */
export interface EncoderSpec extends EncoderRange {
  readonly unit: string;
}

/** Range and readout of each phaser parameter; `spread` is labelled Phase because that is the operator's word. */
export const PHASER_PARAMS: Readonly<Record<PhaserParam, EncoderSpec>> = {
  rate: { label: 'Rate', min: 0.125, max: 8, unit: 'x' },
  size: { label: 'Size', min: 0, max: 180, unit: '' },
  spread: { label: 'Phase', min: 0, max: 1440, unit: '°' },
};

/** Whether an encoder turns phasers instead of fixture values (the old `a in FXP`). */
export function isPhaserParam(attr: EncoderAttr): attr is PhaserParam {
  return attr in PHASER_PARAMS;
}

/** The range an encoder sweeps: the attribute table for fixture values, the phaser table otherwise. */
export function encoderSpec(attr: EncoderAttr): EncoderSpec {
  return isPhaserParam(attr) ? PHASER_PARAMS[attr] : ATTR[attr];
}
