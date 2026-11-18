import type { GdtfChannel, GdtfInfo } from './GdtfInfo';

/** No stage fixture is smaller than a pinspot or larger than a long batten row: a size outside is a file error. */
const MIN_SIZE = 0.05;
const MAX_SIZE = 3;

/**
 * Whether a GDTF is a stand-in whose geometry says nothing about the product. Vectorworks writes a generic GDTF for
 * a fixture without a real one and names its manufacturer `Custom` (`Custom@Name` as the MVR `GDTFSpec`), and some
 * tools ship a one-channel stub per fixture; both hold placeholder models.
 */
function isStandIn(info: GdtfInfo, channels: readonly GdtfChannel[], spec: string): boolean {
  const isCustom = (text: string): boolean => /^custom(@|$)/i.test(text.trim());
  return channels.length <= 1 || isCustom(spec) || isCustom(info.fileName) || isCustom(info.manufacturer);
}

/**
 * The overall size in metres the desk draws a fixture with: the largest dimension of the geometry tree its mode
 * names. The desk body is one model per type and is scaled as a whole, so one number is all it can follow, and the
 * largest one is what a designer judges a unit by against the truss. `undefined` when the GDTF cannot be trusted
 * for it (a stand-in, no sized model, or a size outside 0.05 m to 3 m): the fixture then keeps the desk's own size.
 */
export function gdtfBodySize(
  info: GdtfInfo,
  modeName: string,
  channels: readonly GdtfChannel[],
  spec: string,
): number | undefined {
  if (isStandIn(info, channels, spec)) return undefined;
  const mode = info.modes.find((candidate) => candidate.name === modeName) ?? info.modes[0];
  const tree = info.sizes.find((candidate) => candidate.geometry === mode?.geometry);
  const largest = tree ? Math.max(...tree.size) : 0;
  return largest >= MIN_SIZE && largest <= MAX_SIZE ? largest : undefined;
}
