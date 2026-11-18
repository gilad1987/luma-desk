import type { DmxPatch } from '../../domain/stage/DmxPatch';
import type { StageFixture } from '../../domain/stage/StageDesign';
import { bodyShift } from '../design/bodyShift';
import { restRotation } from '../math/restRotation';
import { toAbsoluteAddress } from '../patch/address';
import { deskType } from './deskType';
import type { ExportContext } from './ExportContext';
import { gdtfIdentity } from './gdtfIdentity';
import { poseMatrix } from './poseMatrix';
import { xmlElement, xmlText } from './xmlWriter';

/** Where one fixture sits in the patch and on its truss. */
export interface FixtureSlot {
  /** Undefined when the fixture is written without an address (its stored patch was out of range). */
  readonly patch: DmxPatch | undefined;
  /** 1-based place of the fixture on its truss (or among the fixtures without a truss), in design order. */
  readonly unit: number;
}

/**
 * One `<Fixture>`. FixtureID and FixtureIDNumeric both hold the desk id, so the import gives the fixture the same id
 * again; the patch is written as one absolute address on break 0, the only break the desk keeps (G9). An imported
 * fixture keeps its uuid. A wall-mounted fixture (the LED screen driver) has the hanging rest rotation. The matrix
 * is placed at the mounting point (`bodyShift`), as MVR defines the insertion point.
 */
export function fixtureXml(fixture: StageFixture, slot: FixtureSlot, context: ExportContext): string {
  const id = String(fixture.id);
  const gdtf = gdtfIdentity(fixture, context.design.mvr);
  const rotation = fixture.rotation ?? restRotation(fixture.mount);
  const origin = bodyShift(fixture, context.design.mvr, 'toMount');
  const address = slot.patch ? String(toAbsoluteAddress(slot.patch)) : undefined;
  const children = [
    xmlText('Matrix', poseMatrix(origin, rotation, context.offset)),
    xmlText('GDTFSpec', gdtf.spec),
    xmlText('GDTFMode', gdtf.mode),
    xmlText('FixtureID', id),
    xmlText('FixtureIDNumeric', id),
    xmlText('UnitNumber', String(slot.unit)),
    ...(address === undefined ? [] : [xmlElement('Addresses', {}, [xmlText('Address', address, { break: '0' })])]),
  ];
  const uuid = context.design.mvr?.fixtures[id]?.uuid ?? context.uuidOf('fixture', id);
  return xmlElement('Fixture', { uuid, name: `${deskType(fixture).name} ${id}` }, children);
}
