import { makeZip } from './makeZip';

/** The parts of a synthetic GDTF that tests vary; everything else is fixed. */
export interface GdtfParts {
  /** Inner XML of `<Geometries>`. */
  readonly geometries?: string;
  /** Inner XML of `<DMXModes>`; `gdtfMode` builds one mode. */
  readonly modes?: string;
  /** Inner XML of `<Models>`, which gives the body its real size; absent leaves the element out, as many GDTFs do. */
  readonly models?: string;
  /** The `FixtureType` name; a test that groups fixtures by product gives each GDTF its own. */
  readonly name?: string;
  /** More entries of the archive by path: the model files (`models/gltf/head.glb`). */
  readonly files?: Readonly<Record<string, Uint8Array | string>>;
}

/**
 * Builds a `.gdtf` file in memory: a ZIP with `description.xml` and the given model files. Tests use it instead of
 * real GDTF files, which carry third-party content the repo must not commit.
 */
export function makeGdtf(parts: GdtfParts): Uint8Array {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?><GDTF DataVersion="1.2">' +
    `<FixtureType Name="${parts.name ?? 'Test Spot'}" Manufacturer="Acme">` +
    (parts.models === undefined ? '' : `<Models>${parts.models}</Models>`) +
    `<Geometries>${parts.geometries ?? ''}</Geometries>` +
    `<DMXModes>${parts.modes ?? ''}</DMXModes>` +
    '</FixtureType></GDTF>';
  return makeZip({ 'description.xml': xml, ...parts.files });
}
