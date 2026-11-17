import { GOBO_NAMES, SCREEN_MODES } from '../../../domain/attributes';
import { encoderSpec, type EncoderAttr } from './encoderSpec';

/**
 * The text under a knob. Small values get one decimal (except the dimmer) so slow turns stay visible; the gobo wheel
 * shows the slot name, or the LED content name while the Gobo tab shows a screen (`screenGobo`).
 */
export function formatEncoderValue(attr: EncoderAttr, value: number | null, screenGobo: boolean): string {
  if (value == null) return '—';
  if (attr === 'gobo') {
    const slot = Math.round(value);
    return screenGobo ? (SCREEN_MODES[slot] ?? '') : `${slot} ${GOBO_NAMES[slot] || ''}`;
  }
  const shown = Math.abs(value) < 10 && attr !== 'dim' ? (+value).toFixed(1) : Math.round(value);
  return shown + (encoderSpec(attr).unit || '');
}
