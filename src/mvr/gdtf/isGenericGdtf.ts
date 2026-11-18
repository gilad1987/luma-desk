import type { GdtfChannel } from './GdtfInfo';

/**
 * The GDTF attributes of a generic placeholder fixture. CAD tools that have no GDTF for a product write a stand-in
 * with only these channels (intensity, position, zoom and empty slots), whatever the real product is.
 */
const GENERIC_ATTRIBUTES: ReadonlySet<string> = new Set(['Dimmer', 'Pan', 'Tilt', 'Zoom', 'NoFeature']);

/**
 * True when the mode's channels carry nothing beyond the generic stand-in set, so they cannot tell a profile from a
 * wash or a strobe. The test reads the content only, never the manufacturer, because each tool names its stand-ins
 * differently. A mode without channels is generic too: it says nothing about the product.
 */
export function isGenericGdtf(channels: readonly GdtfChannel[]): boolean {
  return channels.every((channel) => GENERIC_ATTRIBUTES.has(channel.attribute));
}
