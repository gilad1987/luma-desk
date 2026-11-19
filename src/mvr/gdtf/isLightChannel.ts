import type { GdtfChannel } from './GdtfInfo';

/**
 * The starts of the GDTF attribute names that only a light has: intensity, colour, gobo and beam shaping. Position
 * (`Pan`, `Tilt`), `Control`, `Fog`, `Haze` and `Fan` are not in the list: a hoist, a camera and a hazer have them.
 */
const LIGHT_PREFIXES: readonly string[] = [
  ...['Dimmer', 'Color', 'CTO', 'CTC', 'CTB', 'Tint', 'HSB_', 'CIE_', 'Gobo', 'AnimationWheel', 'Prism', 'Frost'],
  ...['Iris', 'Zoom', 'Focus', 'Shutter', 'Strobe', 'Blade', 'Shaper', 'LampControl', 'LampPowerMode', 'LEDFrequency'],
];

/**
 * True when the channel shows that the device emits light. Many real GDTF files of LED fixtures have no `Beam`
 * geometry and no `Dimmer` (colour mix only), so the missing dimmer alone must not make a light "not a light".
 */
export function isLightChannel(channel: GdtfChannel): boolean {
  if (channel.attr !== undefined && channel.attr !== 'pan' && channel.attr !== 'tilt') return true;
  return LIGHT_PREFIXES.some((prefix) => channel.attribute.startsWith(prefix));
}
