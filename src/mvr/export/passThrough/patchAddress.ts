import type { DmxPatch } from '../../../domain/stage/DmxPatch';
import { decodeAbsolute, toAbsoluteAddress } from '../../patch/address';
import { attr, childElement, childElements } from '../../xml/elements';
import { insertChild } from './fixtureChildren';

/** The `break` of an `<Address>`; missing or unreadable is break 0, as the spec and the import read it. */
export function breakOf(address: Element): number {
  const value = Number(attr(address, 'break') ?? '0');
  return Number.isInteger(value) ? value : 0;
}

/** The address the desk patch stands for: the lowest break, first in file order on a tie, as `patchFromAddresses`. */
export function deskBreak(addresses: readonly Element[]): Element | undefined {
  return addresses.reduce<Element | undefined>(
    (best, next) => (best === undefined || breakOf(next) < breakOf(best) ? next : best),
    undefined,
  );
}

/** The `<Address>` elements of a fixture. */
export function addressesOf(fixture: Element): Element[] {
  const list = childElement(fixture, 'Addresses');
  return list ? childElements(list, 'Address') : [];
}

/**
 * The break the desk models of one fixture, and its `<Address>` when it has one. `vacant` is the break the desk's own
 * data of the original names for a fixture it wrote unpatched (M-2). It holds while no address of that break or of a
 * lower one is back in the file; the breaks still there are then not the desk's and no desk edit may touch them.
 */
export function modelledBreak(fixture: Element, vacant: number | undefined): { address?: Element; number: number } {
  const lowest = deskBreak(addressesOf(fixture));
  if (vacant !== undefined && (!lowest || breakOf(lowest) > vacant)) return { number: vacant };
  return lowest ? { address: lowest, number: breakOf(lowest) } : { number: 0 };
}

/** The absolute address of a desk patch, or `undefined` for a patch out of range that no reader could take. */
export function absoluteOf(patch: DmxPatch): number | undefined {
  try {
    return toAbsoluteAddress(patch);
  } catch {
    return undefined;
  }
}

/** True when the fixture still has an address a reader would patch from. */
export function keepsAddress(fixture: Element): boolean {
  return addressesOf(fixture).some((address) => (decodeAbsolute(address.textContent ?? '') ?? 0) > 0);
}

/** What the export did with the address of the break the desk models. */
export type AddressEdit = 'kept' | 'changed' | 'removed' | 'spare';

/**
 * Removes the address of a fixture the user unpatched on the desk. The import gave it a patch only because this
 * address was readable and not 0, so a missing desk patch is an edit. MVR has no "no address" value (the spec makes the
 * address text mandatory), so the break loses its `<Address>`; an empty `<Addresses>` goes too.
 */
function unpatch(list: Element | undefined, current: Element | undefined): AddressEdit {
  const absolute = current && decodeAbsolute(current.textContent ?? '');
  if (!list || !current || absolute === undefined || absolute === 0) return 'spare';
  current.remove();
  if (childElements(list).length === 0) list.remove();
  return 'removed';
}

/**
 * Writes the desk patch into the one break the desk models; the other breaks stay as the file had them. The text
 * changes only when the address differs, so `1.1` stays `1.1`. A fixture without a desk patch whose file address is
 * unpatched or unreadable is a spare and stays as the file has it; the export does not invent an address.
 */
export function patchAddress(fixture: Element, patch: DmxPatch | undefined, vacant?: number): AddressEdit {
  const list = childElement(fixture, 'Addresses');
  const { address: current, number } = modelledBreak(fixture, vacant);
  if (!patch) return unpatch(list, current);
  const value = absoluteOf(patch);
  if (value === undefined) return 'kept';
  if (current) {
    if (decodeAbsolute(current.textContent ?? '') === value) return 'kept';
    current.textContent = String(value);
    return 'changed';
  }
  const doc = fixture.ownerDocument;
  const address = doc.createElement('Address');
  address.setAttribute('break', String(number));
  address.textContent = String(value);
  const host = list ?? insertChild(fixture, doc.createElement('Addresses'));
  // First in the list: the desk's break is lower than every break the file kept.
  host.insertBefore(address, host.firstChild);
  return 'changed';
}
