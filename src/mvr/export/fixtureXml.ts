import type { DmxPatch } from '../../domain/stage/DmxPatch';
import type { MvrFixtureInfo } from '../../domain/stage/mvr';
import type { StageFixture } from '../../domain/stage/StageDesign';
import { bodyShift } from '../design/bodyShift';
import { restRotation } from '../math/restRotation';
import { toAbsoluteAddress } from '../patch/address';
import { deskType } from './deskType';
import type { ExportContext } from './ExportContext';
import { fileDataXml } from './fixtureFileData';
import { gdtfIdentity } from './gdtfIdentity';
import { poseMatrix } from './poseMatrix';
import { writtenCommands } from './writtenCommands';
import { xmlElement, xmlText } from './xmlWriter';

/** Where one fixture sits in the patch and on its truss. */
export interface FixtureSlot {
  /** Undefined when the fixture is written without an address (its stored patch was out of range). */
  readonly patch: DmxPatch | undefined;
  /** 1-based place of the fixture on its truss (or among the fixtures without a truss), in design order. */
  readonly unit: number;
}

/**
 * The `CustomIdType` and `CustomId` the file gave an imported fixture, in the order of the MVR 1.6 Fixture children
 * table (`CustomIdType`, then `CustomId`, after `Addresses`). The design keeps them "so a re-export loses none"
 * (`MvrFixtureInfo`), and they select the fixture on a console, so the plain writer writes them too.
 */
function poolIds(info: MvrFixtureInfo | undefined): string[] {
  const { customIdType, customId } = info ?? {};
  return [
    ...(customIdType === undefined ? [] : [xmlText('CustomIdType', String(customIdType))]),
    ...(customId === undefined ? [] : [xmlText('CustomId', String(customId))]),
  ];
}

/**
 * One `<Fixture>`. FixtureID and FixtureIDNumeric both hold the desk id, so the import gives the fixture the same id
 * again; the patch is written as one absolute address on break 0, the only break the desk keeps (G9). An imported
 * fixture keeps its uuid. A wall-mounted fixture (the LED screen driver) has the hanging rest rotation. The matrix
 * is placed at the mounting point (`bodyShift`), as MVR defines the insertion point. The file data the design holds
 * (`fileDataXml`) is written at its places in the Table 26 child order.
 */
export function fixtureXml(fixture: StageFixture, slot: FixtureSlot, context: ExportContext): string {
  const id = String(fixture.id);
  const gdtf = gdtfIdentity(fixture, context.design.mvr);
  const rotation = fixture.rotation ?? restRotation(fixture.mount);
  const origin = bodyShift(fixture, context.design.mvr, 'toMount');
  const address = slot.patch ? String(toAbsoluteAddress(slot.patch)) : undefined;
  const info = context.design.mvr?.fixtures[id];
  const data = fileDataXml(context.design.mvr, info, writtenCommands(context.design.mvr, fixture).texts);
  const children = [
    xmlText('Matrix', poseMatrix(origin, rotation, context.offset)),
    ...data.classing,
    xmlText('GDTFSpec', gdtf.spec),
    xmlText('GDTFMode', gdtf.mode),
    ...data.traits,
    xmlText('FixtureID', id),
    xmlText('FixtureIDNumeric', id),
    xmlText('UnitNumber', String(slot.unit)),
    ...(address === undefined ? [] : [xmlElement('Addresses', {}, [xmlText('Address', address, { break: '0' })])]),
    ...data.drawn,
    ...poolIds(info),
  ];
  const uuid = info?.uuid ?? context.uuidOf('fixture', id);
  return xmlElement('Fixture', { uuid, name: `${deskType(fixture).name} ${id}` }, children);
}
