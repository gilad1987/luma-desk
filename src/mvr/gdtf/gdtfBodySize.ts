import type { GdtfInfo } from './GdtfInfo';

/** No stage fixture is smaller than a pinspot or larger than a long batten row: a size outside is a file error. */
const MIN_SIZE = 0.05;
const MAX_SIZE = 3;

/**
 * Whether a GDTF is one Vectorworks wrote for a fixture that has no real GDTF: it names the manufacturer `Custom`
 * (`Custom@Name` as the MVR `GDTFSpec`). Its geometry is the symbol of the CAD file, so its sizes and meshes are
 * real; its beam data (always Wash 25 degrees) and its pan and tilt ranges are placeholders.
 */
export function isVendorSymbol(info: GdtfInfo, spec: string): boolean {
  const isCustom = (text: string): boolean => /^custom(@|$)/i.test(text.trim());
  return isCustom(spec) || isCustom(info.fileName) || isCustom(info.manufacturer);
}

/**
 * The estimated size in metres on X, Y and Z of the geometry tree the mode names (the first mode for an unknown
 * name); `undefined` when no model in the tree has a size.
 */
export function gdtfTreeSize(info: GdtfInfo, modeName: string): readonly [number, number, number] | undefined {
  const mode = info.modes.find((candidate) => candidate.name === modeName) ?? info.modes[0];
  return info.sizes.find((candidate) => candidate.geometry === mode?.geometry)?.size;
}

/**
 * The overall size in metres the desk draws a fixture with: the largest dimension of the geometry tree its mode
 * names. The desk body is one model per type and is scaled as a whole, so one number is all it can follow, and the
 * largest one is what a designer judges a unit by against the truss. Geometry trust is apart from type trust: a
 * `Custom@` GDTF and a GDTF with one channel say nothing about the kind of fixture (`classifyFixture`), but their
 * model sizes are real, so they are used. `undefined` when the GDTF gives no usable size (no sized model, or a size
 * outside 0.05 m to 3 m, which is a file in another unit): the fixture then keeps the desk's own size.
 */
export function gdtfBodySize(info: GdtfInfo, modeName: string): number | undefined {
  const size = gdtfTreeSize(info, modeName);
  const largest = size ? Math.max(...size) : 0;
  return largest >= MIN_SIZE && largest <= MAX_SIZE ? largest : undefined;
}
