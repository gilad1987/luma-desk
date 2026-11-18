import type { Mat4 } from '../math/Mat4';
import { attr, childElement, childElements, childRawText, childText } from '../xml/elements';
import type { MvrAddress, MvrFixtureRecord } from './MvrScene';

/** A whole number, or `undefined` for missing, empty or other text (`Number('')` would give 0). */
function parseInteger(text: string | undefined): number | undefined {
  if (text === undefined || text.trim() === '') return undefined;
  const value = Number(text);
  return Number.isInteger(value) ? value : undefined;
}

/** The `<Addresses>` of a fixture in file order; a missing or unreadable `break` is break 0, as the spec defaults. */
function readAddresses(fixture: Element): MvrAddress[] {
  const list = childElement(fixture, 'Addresses');
  return (list ? childElements(list, 'Address') : []).map((address) => ({
    dmxBreak: parseInteger(attr(address, 'break')) ?? 0,
    value: address.textContent?.trim() ?? '',
  }));
}

/**
 * Reads a `<Fixture>` as the file states it. The GDTF name, mode and addresses stay raw text, because resolving them
 * needs the archive and the desk rules, which later steps own; the GDTF name and mode keep their spaces, as GDTF
 * names must match exactly. `world` is the fixture's world matrix and `layer` the
 * uuid of its `<Layer>`, both from the scene walk.
 */
export function readFixture(fixture: Element, world: Mat4, layer: string): MvrFixtureRecord {
  const fixtureIdNumeric = parseInteger(childText(fixture, 'FixtureIDNumeric'));
  const focus = childText(fixture, 'Focus');
  return {
    uuid: attr(fixture, 'uuid') ?? '',
    name: attr(fixture, 'name') ?? '',
    fixtureId: childText(fixture, 'FixtureID') ?? '',
    ...(fixtureIdNumeric === undefined ? {} : { fixtureIdNumeric }),
    gdtfSpec: childRawText(fixture, 'GDTFSpec') ?? '',
    gdtfMode: childRawText(fixture, 'GDTFMode') ?? '',
    addresses: readAddresses(fixture),
    ...(focus ? { focus } : {}),
    layer,
    matrix: world,
  };
}
