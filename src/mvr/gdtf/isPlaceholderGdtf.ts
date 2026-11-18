import type { GdtfChannel, GdtfInfo } from './GdtfInfo';
import { isGenericGdtf } from './isGenericGdtf';

/**
 * True when the GDTF is a stand-in a program wrote because it had no real file for the product: it has no `Beam`
 * geometry, and its mode has no channel or only generic channels (`isGenericGdtf`). The channel count is no test:
 * a real hazer has one channel (`Fog1`), and that file does say what the product is. Capture writes such
 * files (`DataVersion="1.0"`, one `Geometry`, channels `Dimmer1`, `Dimmer2`...) for every product of its own
 * library. Such a file cannot say what the product is, so it must never prove "this is not a light": the fixture
 * name decides the type. The test reads the content only, never the manufacturer, because each program names its
 * stand-ins differently.
 */
export function isPlaceholderGdtf(info: GdtfInfo, channels: readonly GdtfChannel[]): boolean {
  return !info.hasBeam && isGenericGdtf(channels);
}
