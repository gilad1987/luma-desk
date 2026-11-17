import { makeZip } from './makeZip';

/** The parts of a synthetic GDTF that tests vary; everything else is fixed. */
export interface GdtfParts {
  /** Inner XML of `<Geometries>`. */
  readonly geometries?: string;
  /** Inner XML of `<DMXModes>`; `gdtfMode` builds one mode. */
  readonly modes?: string;
}

/**
 * Builds a `.gdtf` file in memory: a ZIP with one `description.xml`. Tests use it instead of real GDTF files, which
 * carry third-party content the repo must not commit.
 */
export function makeGdtf(parts: GdtfParts): Uint8Array {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?><GDTF DataVersion="1.2">' +
    '<FixtureType Name="Test Spot" Manufacturer="Acme">' +
    `<Geometries>${parts.geometries ?? ''}</Geometries>` +
    `<DMXModes>${parts.modes ?? ''}</DMXModes>` +
    '</FixtureType></GDTF>';
  return makeZip({ 'description.xml': xml });
}
