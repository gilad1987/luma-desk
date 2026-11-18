import { UNIVERSE_CHANNELS } from '../../../domain/stage/parse/parsePatch';
import { decodeAbsolute } from '../../patch/address';
import { attr, childText } from '../../xml/elements';
import type { PatchSpan } from '../patchOverlaps';
import { numericId } from './fileIds';
import type { FileMatch } from './matchFixtures';
import { absoluteOf, addressesOf, deskBreak } from './patchAddress';

/**
 * The name of a file fixture without a number, so no message says "fixture 0": its FixtureID text when it has one
 * (free text is allowed there), else its name, else its uuid. A fixture with a number keeps the number.
 */
function nameOf(element: Element): { readonly name?: string } {
  if (numericId(element) !== undefined) return {};
  const text = childText(element, 'FixtureID') || attr(element, 'name') || attr(element, 'uuid') || '?';
  return { name: `"${text}"` };
}

/**
 * Every address the export keeps from the file that the desk does not model: the other breaks of desk fixtures and
 * all breaks of fixtures that are not desk fixtures. The auto-patch must not hand them out again and the overlap check
 * must see them. `sizes` gives the real channel count of an address whose GDTF mode the original archive holds; any
 * other address counts as 1 channel and is marked as an estimate.
 */
export function reservedSpans(matches: readonly FileMatch[], sizes: ReadonlyMap<Element, number>): PatchSpan[] {
  return matches.flatMap(({ element, fixture }) => {
    if (!element.isConnected) return [];
    const addresses = addressesOf(element);
    // An unpatched desk fixture already lost its modelled break, and a desk patch that no address can hold was not
    // written: in both cases every address still here is one the file keeps, so none may be handed out again.
    const written = fixture?.patch !== undefined && absoluteOf(fixture.patch) !== undefined;
    const modelled = written ? deskBreak(addresses) : undefined;
    const who = { id: fixture?.id ?? numericId(element) ?? 0, ...(fixture ? {} : nameOf(element)) };
    return addresses.flatMap((address) => {
      const absolute = address === modelled ? undefined : decodeAbsolute(address.textContent ?? '');
      if (absolute === undefined || absolute === 0) return [];
      const universe = Math.floor((absolute - 1) / UNIVERSE_CHANNELS) + 1;
      const patch = { universe, address: absolute - (universe - 1) * UNIVERSE_CHANNELS, mode: '' };
      const channels = sizes.get(address);
      return [{ ...who, patch, channels: channels ?? 1, known: channels !== undefined }];
    });
  });
}
