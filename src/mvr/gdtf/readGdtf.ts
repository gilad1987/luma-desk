import { MvrArchive } from '../archive/MvrArchive';
import { MvrError, type MvrWarning } from '../MvrWarning';
import { attr, childElement } from '../xml/elements';
import { parseXml } from '../xml/parseXml';
import type { GdtfInfo } from './GdtfInfo';
import { readBeam, readReferences } from './readGdtfGeometry';
import { readModes } from './readGdtfModes';

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

/** The facts of a `FixtureType`; a bad `DMXOffset` adds a `bad-gdtf` warning to `warnings` and drops its break. */
function toInfo(fixtureType: Element, fileName: string, warnings: MvrWarning[]): GdtfInfo {
  const geometries = childElement(fixtureType, 'Geometries');
  const bad = (offset: string): void => {
    const message = `The GDTF file "${fileName}" has a DMXOffset "${offset}" that is not an address; it reads as 1.`;
    warnings.push({ code: 'bad-gdtf', message, ref: fileName });
  };
  return {
    fileName,
    name: attr(fixtureType, 'Name') ?? '',
    manufacturer: attr(fixtureType, 'Manufacturer') ?? '',
    modes: readModes(fixtureType),
    references: geometries ? readReferences(geometries, bad) : [],
    ...(geometries ? readBeam(geometries) : { hasBeam: false }),
  };
}

/**
 * Reads one GDTF file from an MVR archive. MVR writers often ship stub GDTFs (empty files, ZIPs without
 * `description.xml`), and one bad fixture file must not stop the whole import, so every such problem becomes a
 * `bad-gdtf` warning with `ref` = `fileName`, never a throw. Errors that are not file problems still throw.
 */
export function readGdtf(bytes: Uint8Array, fileName: string): GdtfReadResult {
  let doc: Document;
  try {
    const only = (name: string): boolean => name.toLowerCase() === DESCRIPTION;
    const text = MvrArchive.open(bytes, { only }).text(DESCRIPTION);
    if (text === undefined) return badGdtf(fileName, `It has no ${DESCRIPTION}.`);
    doc = parseXml(text);
  } catch (error) {
    if (!(error instanceof MvrError)) throw error;
    return badGdtf(fileName, error.message);
  }
  const fixtureType = childElement(doc.documentElement, 'FixtureType');
  if (fixtureType === undefined) return badGdtf(fileName, `Its ${DESCRIPTION} has no FixtureType.`);
  const warnings: MvrWarning[] = [];
  return { info: toInfo(fixtureType, fileName, warnings), warnings };
}
