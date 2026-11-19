import { MvrArchive } from '../../archive/MvrArchive';
import { breakFootprint } from '../../gdtf/breakFootprint';
import type { GdtfInfo } from '../../gdtf/GdtfInfo';
import { modeChannels } from '../../gdtf/modeChannels';
import { readGdtfTable } from '../../import/gdtfTable';
import { childText } from '../../xml/elements';
import type { FileMatch } from './matchFixtures';
import { addressesOf, breakOf } from './patchAddress';

/** The GDTF files of the original archive by `GDTFSpec`; none when it does not open as it did for the import. */
function gdtfInfos(original: Uint8Array, specs: readonly string[]): ReadonlyMap<string, GdtfInfo> {
  try {
    return readGdtfTable(MvrArchive.open(original), specs).infos;
  } catch {
    return new Map();
  }
}

/**
 * Which GDTF `DMXBreak` an MVR `break` of one fixture means, or `undefined` when the file does not settle it. Both
 * are numbers, not ranks. MVR: "break | Integer | 0 | This is the break ident for this address. This value has to be
 * unique for one fixture." GDTF: "DMXBreak | Int | Number of the DMXBreak; Default value: 1". Neither text says how
 * the two correspond, and the defaults differ (0 and 1), so files hold two readings: the same number, or the MVR
 * number plus 1 (the MVR spec's own examples write `break="0"`). A reading is taken only when every break of the
 * fixture has channels under it and the other reading does not fit; a fixture both fit, or neither, gets no size.
 */
function gdtfBreakOf(
  fileBreaks: readonly number[],
  modeBreaks: ReadonlySet<number>,
): ((n: number) => number) | undefined {
  const same = fileBreaks.every((n) => modeBreaks.has(n));
  const plusOne = fileBreaks.every((n) => modeBreaks.has(n + 1));
  if (same === plusOne) return undefined;
  return same ? (n) => n : (n) => n + 1;
}

/**
 * The real channel count of the addresses the export keeps, by `<Address>` element: those of fixtures that are not
 * desk fixtures and of fixtures with more than one break. The count comes from the fixture's GDTF mode in the original
 * archive, read as the import reads it (`breakFootprint`), for the channels of the address's own break
 * (`gdtfBreakOf`). An address has no entry when the GDTF file is absent, the mode is not one the file names (a guessed
 * mode is not a real count, D3) or the break numbers do not settle which channels are meant; it then counts as an
 * estimate, never as a known size. Call it before any patch, while the fixture still has every break of the file.
 */
export function addressFootprints(original: Uint8Array, matches: readonly FileMatch[]): ReadonlyMap<Element, number> {
  const kept = matches.filter(({ element, fixture }) => !fixture || addressesOf(element).length > 1);
  const specOf = (fixture: Element): string => childText(fixture, 'GDTFSpec') ?? '';
  const sizes = new Map<Element, number>();
  if (kept.length === 0) return sizes;
  const infos = gdtfInfos(
    original,
    kept.map(({ element }) => specOf(element)),
  );
  for (const { element } of kept) {
    const info = infos.get(specOf(element));
    const mode = info && modeChannels(info, childText(element, 'GDTFMode') ?? '', '');
    if (!mode || mode.warnings.length > 0) continue;
    const patched = mode.channels.filter((channel) => channel.offset.length > 0);
    const addresses = addressesOf(element);
    const toGdtf = gdtfBreakOf(addresses.map(breakOf), new Set(patched.map((channel) => channel.dmxBreak)));
    if (!toGdtf) continue;
    for (const address of addresses) {
      const own = toGdtf(breakOf(address));
      const size = breakFootprint(patched.filter((channel) => channel.dmxBreak === own));
      if (size !== undefined) sizes.set(address, size);
    }
  }
  return sizes;
}
