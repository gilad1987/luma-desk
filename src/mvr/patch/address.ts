import { MAX_UNIVERSE, UNIVERSE_CHANNELS } from '../../domain/stage/parse/parsePatch';
import type { MvrWarning } from '../MvrWarning';
import type { MvrAddress } from '../scene/MvrScene';

/** A desk patch point: universe and address both count from 1, as consoles and the patch sheet show them. */
export type DmxAddress = { readonly universe: number; readonly address: number };

const ABSOLUTE = /^\d+$/;
const DOTTED = /^(\d+)\.(\d+)$/;

/** Universe and address of an absolute address `a` of at least 1 (1 is universe 1, address 1; 513 is 2.1). */
function fromAbsolute(a: number): DmxAddress {
  return { universe: Math.floor((a - 1) / UNIVERSE_CHANNELS) + 1, address: ((a - 1) % UNIVERSE_CHANNELS) + 1 };
}

/** Whether `universe.address` is a real patch point: universe 1 to `MAX_UNIVERSE`, address 1 to 512. */
function isPatchPoint(universe: number, address: number): boolean {
  const universeOk = Number.isInteger(universe) && universe >= 1 && universe <= MAX_UNIVERSE;
  return universeOk && Number.isInteger(address) && address >= 1 && address <= UNIVERSE_CHANNELS;
}

/**
 * The absolute DMX address in an MVR `<Address>` or a GDTF `DMXOffset`: a bare number, or `universe.address` turned
 * into `(universe - 1) * 512 + address`. `0` stays 0 (MVR's "not patched"). `undefined` when the text is neither
 * form or lies past universe 63999. Both files share this one decoder, so their rules cannot drift apart.
 */
export function decodeAbsolute(value: string): number | undefined {
  const text = value.trim();
  const dotted = DOTTED.exec(text);
  if (dotted) {
    const [universe, address] = [Number(dotted[1]), Number(dotted[2])];
    return isPatchPoint(universe, address) ? (universe - 1) * UNIVERSE_CHANNELS + address : undefined;
  }
  const absolute = ABSOLUTE.test(text) ? Number(text) : Infinity;
  return absolute <= MAX_UNIVERSE * UNIVERSE_CHANNELS ? absolute : undefined;
}

/** Decodes one raw `<Address>` text. `0` and empty mean "not patched", which MVR writers use for spare fixtures. */
function decode(value: string): DmxAddress | 'unpatched' | 'bad' {
  if (value.trim() === '') return 'unpatched';
  const absolute = decodeAbsolute(value);
  if (absolute === undefined) return 'bad';
  return absolute === 0 ? 'unpatched' : fromAbsolute(absolute);
}

/** The address of the lowest break, first in file order on a tie: the break that carries the GDTF mode's base. */
function lowestBreak(addresses: readonly MvrAddress[]): MvrAddress | undefined {
  return addresses.reduce<MvrAddress | undefined>(
    (best, next) => (best === undefined || next.dmxBreak < best.dmxBreak ? next : best),
    undefined,
  );
}

/**
 * Turns a fixture's raw MVR addresses into the one patch point the desk can hold. The desk patches one break per
 * fixture, so it keeps the lowest break and warns once when the fixture has more. An unpatched fixture is normal
 * (most fixtures in a real plot are spares), so it gives no patch and no warning; only unreadable text warns.
 * `ref` names the fixture in the warnings.
 */
export function patchFromAddresses(
  addresses: readonly MvrAddress[],
  ref: string,
): { readonly patch?: DmxAddress; readonly warnings: readonly MvrWarning[] } {
  const first = lowestBreak(addresses);
  if (first === undefined) return { warnings: [] };
  const warnings: MvrWarning[] = [];
  const breaks = new Set(addresses.map((address) => address.dmxBreak)).size;
  if (breaks > 1) {
    const message = `The fixture uses ${breaks} DMX breaks; the desk patches only break ${first.dmxBreak}.`;
    warnings.push({ code: 'multi-break', message, ref });
  }
  const decoded = decode(first.value);
  if (decoded === 'bad') {
    const message = `The DMX address "${first.value}" is not a valid address (universe 1 to ${MAX_UNIVERSE}).`;
    warnings.push({ code: 'bad-address', message, ref });
  }
  return typeof decoded === 'string' ? { warnings } : { patch: decoded, warnings };
}

/**
 * The absolute MVR address of a desk patch point, `(universe - 1) * 512 + address`: the inverse of what
 * `patchFromAddresses` decodes, and the one form every MVR reader accepts.
 * @throws RangeError when the universe is outside 1 to 63999 or the address is outside 1 to 512, because such a
 * number would decode to a channel of another universe and silently patch the fixture somewhere else.
 */
export function toAbsoluteAddress({ universe, address }: DmxAddress): number {
  const need = `universe 1 to ${MAX_UNIVERSE} and address 1 to 512`;
  if (!isPatchPoint(universe, address))
    throw new RangeError(`toAbsoluteAddress: need ${need}, got ${universe}.${address}`);
  return (universe - 1) * UNIVERSE_CHANNELS + address;
}
