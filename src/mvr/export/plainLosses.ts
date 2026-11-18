import type { StageDesign } from '../../domain/stage/StageDesign';
import { LUMA_PROVIDER } from '../luma/lumaData';
import { auxUuid } from './fixtureFileData';
import { isStandInSpec } from './gdtfIdentity';
import { writtenCommands } from './writtenCommands';

/**
 * What the desk never held of an imported fixture, so it cannot count it: the plain writer has no place to read it.
 * The names are the MVR 1.6 Table 26 children the import does not keep. `Color`, `CustomCommands`, `Function`,
 * `DMXInvertPan`, `DMXInvertTilt`, `CastShadow`, `Classing` and `Position` are held and written (`fileDataXml`).
 */
const NOT_HELD =
  'Fixture data of the imported file that the desk does not hold is not in this export: DMX addresses of breaks ' +
  'other than the first, the group hierarchy, Protocols, Alignments, Overwrites, Connections, Mappings, Gobo, ' +
  'ChildPosition and the data of other programs. The desk cannot count them; import the file again and export ' +
  'from it to keep them.';

/** The sentence when it counts something. */
const some = (count: number, text: string): string[] => (count > 0 ? [`${count} ${text}`] : []);

/** Fixtures whose `Classing` or `Position` the writer cannot write: the file defined no such node with a UUID. */
function danglingReferences(design: StageDesign): number {
  const { mvr } = design;
  const lost = (index: number | undefined, table: 'classes' | 'positions'): boolean =>
    index !== undefined && auxUuid(mvr?.[table]?.[index]) === undefined;
  return Object.values(mvr?.fixtures ?? {}).filter(
    (info) => lost(info.classing, 'classes') || lost(info.position, 'positions'),
  ).length;
}

/** Fixtures with commands of the file that are not written, by the reason (`writtenCommands`). */
function lostCommands(design: StageDesign, why: 'type' | 'aim'): number {
  return design.fixtures.filter((fixture) => writtenCommands(design.mvr, fixture).lost === why).length;
}

/**
 * What the plain writer loses of an imported design besides the scenery, by kind, with a count where the design holds
 * one (audit B1, C5, C6). The plain writer runs when the original bytes are gone, and only the original holds this
 * data; the user must read the loss here and not find it on a console. `CustomId` and `CustomIdType` are written
 * (`fixtureXml`) and so are no loss. `FixtureTypeId` is kept by the design, but the MVR 1.6 Fixture node has no such
 * child, and the export never writes an element the spec does not define.
 */
export function plainLosses(design: StageDesign): string[] {
  const infos = Object.values(design.mvr?.fixtures ?? {});
  const focused = infos.filter((info) => info.focus !== undefined).length;
  const typed = infos.filter((info) => info.fixtureTypeId !== undefined).length;
  return [
    NOT_HELD,
    ...some(focused, 'fixtures aimed at a focus point in the file; their Focus references are not in this export.'),
    ...some(typed, 'fixtures had a FixtureTypeId in the file; MVR 1.6 has no such element, so it is not written.'),
    ...some(
      danglingReferences(design),
      'fixtures named a class or a position that the file did not define; those references are not in this export.',
    ),
    ...some(
      lostCommands(design, 'type'),
      'fixtures have another type than in the file; their CustomCommands address the GDTF of the file and are not ' +
        'in this export.',
    ),
    ...some(
      lostCommands(design, 'aim'),
      "fixtures: the rest aim changed on the desk; the file's pan and tilt commands are not written.",
    ),
  ];
}

/**
 * The line for fixtures that name a desk stand-in GDTF. MVR 1.6: "The archive shall contain one root file named
 * `GeneralSceneDescription.xml`, along with all other resource files referenced via this Root File." The desk's LED
 * screen and device types have no real product, so the file names a GDTF that exists nowhere; the export says so
 * and does not send the user to GDTF-Share for it.
 */
export function standInNote(count: number, specs: readonly string[]): string[] {
  const names = specs.filter(isStandInSpec).join(', ');
  const text =
    `fixtures name ${LUMA_PROVIDER} stand-in GDTF files (${names}) with the mode "Default": no such GDTF file ` +
    'exists, in this file or on GDTF-Share, though MVR requires every named file in the archive. Give them a real ' +
    'type in the target application.';
  return some(count, text);
}
