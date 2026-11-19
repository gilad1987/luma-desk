import type { GdtfChannel } from './GdtfInfo';

/**
 * The GDTF colour attributes the optics read does not turn into a colour system: RGB, HSB and CIE mixing, and colour
 * macros. A unit with one of them changes colour, so its file colour is no fixed gel.
 */
const UNMODELLED_COLOUR = /^(?:ColorRGB_|HSB_|CIE_|ColorMacro)/;

/** True when the mode has a colour channel that the stored optics do not describe (`MvrColourMix`). */
export function mixesColour(channels: readonly GdtfChannel[]): boolean {
  return channels.some(({ attribute }) => UNMODELLED_COLOUR.test(attribute));
}
