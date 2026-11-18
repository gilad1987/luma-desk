import { MvrArchive } from '../archive/MvrArchive';
import { MvrError, type MvrWarning } from '../MvrWarning';
import { attr, childElement, descendantElements } from '../xml/elements';
import { parseXml } from '../xml/parseXml';
import { gdtfEntryNames } from './gdtfEntries';
import type { GdtfInfo } from './GdtfInfo';
import { readOpticsSource } from './optics/readOpticsSource';
import { readBodies } from './readGdtfBody';
import { readBeam, readReferences } from './readGdtfGeometry';
import { readModes } from './readGdtfModes';
import { readSizes } from './readGdtfSizes';

/** The one file of a GDTF archive that describes the fixture. */
const DESCRIPTION = 'description.xml';

/** A GDTF read: `info` when the file is usable, else a `bad-gdtf` warning. */
export interface GdtfReadResult {
  readonly info?: GdtfInfo;
  readonly warnings: readonly MvrWarning[];
}

function badGdtf(fileName: string, reason: string): GdtfReadResult {
  const message = `The GDTF file "${fileName}" cannot be read, so its fixtures get a default type. ${reason}`;
  return { warnings: [{ code: 'bad-gdtf', message, ref: fileName }] };
}

/**
 * The facts of a `FixtureType`; a bad `DMXOffset` adds a `bad-gdtf` warning to `warnings` and drops its break.
 * `entries` are the entry names of the GDTF archive, where the models' mesh files are looked up.
 */
function toInfo(fixtureType: Element, fileName: string, entries: readonly string[], warnings: MvrWarning[]): GdtfInfo {
  const geometries = childElement(fixtureType, 'Geometries');
  const dropped = { count: 0 };
  const modes = readModes(fixtureType, dropped);
  if (dropped.count > 0) {
    const what = dropped.count === 1 ? 'channel Offset is' : 'channel Offsets are';
    const message = `In the GDTF file "${fileName}", ${dropped.count} ${what} below 1 or not a whole number, so no DMX slot.`;
    warnings.push({ code: 'bad-gdtf', message, ref: fileName });
  }
  const bad = (offset: string): void => {
    const message = `The GDTF file "${fileName}" has a DMXOffset "${offset}" that is not an address; it reads as 1.`;
    warnings.push({ code: 'bad-gdtf', message, ref: fileName });
  };
  return {
    fileName,
    name: attr(fixtureType, 'Name') ?? '',
    manufacturer: attr(fixtureType, 'Manufacturer') ?? '',
    modes,
    references: geometries ? readReferences(geometries, bad) : [],
    ...(geometries ? readBeam(geometries) : { hasBeam: false }),
    hasDisplay: geometries !== undefined && descendantElements(geometries, 'Display').length > 0,
    sizes: readSizes(fixtureType),
    bodies: readBodies(fixtureType, modes, entries),
    optics: readOpticsSource(fixtureType, modes),
  };
}

/**
 * Reads one GDTF file from an MVR archive. MVR writers often ship stub GDTFs (empty files, ZIPs without
 * `description.xml`), and one bad fixture file must not stop the whole import, so every such problem becomes a
 * `bad-gdtf` warning with `ref` = `fileName`, never a throw. Errors that are not file problems still throw.
 */
export function readGdtf(bytes: Uint8Array, fileName: string): GdtfReadResult {
  let doc: Document;
  let entries: readonly string[];
  try {
    const only = (name: string): boolean => name.toLowerCase() === DESCRIPTION;
    const text = MvrArchive.open(bytes, { only }).text(DESCRIPTION);
    if (text === undefined) return badGdtf(fileName, `It has no ${DESCRIPTION}.`);
    doc = parseXml(text);
    // after the open, which has told a file that is no ZIP apart; the names are where the mesh files are looked up
    entries = gdtfEntryNames(bytes);
  } catch (error) {
    if (!(error instanceof MvrError)) throw error;
    return badGdtf(fileName, error.message);
  }
  const fixtureType = childElement(doc.documentElement, 'FixtureType');
  if (fixtureType === undefined) return badGdtf(fileName, `Its ${DESCRIPTION} has no FixtureType.`);
  const warnings: MvrWarning[] = [];
  return { info: toInfo(fixtureType, fileName, entries, warnings), warnings };
}
