import type { FixtureTypeId } from '../../../src/domain/FixtureType';
import { TYPES } from '../../../src/domain/fixtureTypes';
import { makeMvr } from './makeMvr';

/** The desk type that names `spec` as its GDTF. */
function typeNaming(spec: string): FixtureTypeId {
  const found = (Object.keys(TYPES) as FixtureTypeId[]).find((id) => TYPES[id].gdtfSpec === spec);
  if (!found) throw new Error(`no desk type names ${spec}`);
  return found;
}

/** A desk type whose GDTF mode is in the export's footprint table: an unpatched fixture of it is auto-patched. */
export const SIZED_TYPE = typeNaming('Robe@Robin MegaPointe@r3038.gdtf');
/** A desk type whose GDTF mode is not in the table: the desk has only an estimate of its channel count. */
export const UNSIZED_TYPE = typeNaming('Robe Lighting@FORTE.gdtf');

/** The uuid of test fixture `n`. */
export const passUuid = (n: number): string => `A0000000-0000-4000-8000-00000000000${n}`;

/** A 90 degree turn about Z, as an MVR matrix without the offset group. */
export const ROT90Z = '{0,1,0}{-1,0,0}{0,0,1}';

/** What one test `<Fixture>` holds besides its uuid and id. */
export interface FxParts {
  readonly at?: string;
  readonly addresses?: string;
  readonly gdtf?: string;
  readonly mode?: string;
  readonly children?: string;
}

/** One `<Fixture>`, identity-placed at the origin unless `at` gives the whole matrix text. */
export function fx(uuid: string, id: number, parts: FxParts = {}): string {
  const { at = '{1,0,0}{0,1,0}{0,0,1}{0,0,6000}', addresses = '', gdtf = 'Test@Spot.gdtf', mode = 'Mode 1' } = parts;
  const children = parts.children ? `<ChildList>${parts.children}</ChildList>` : '';
  return (
    `<Fixture uuid="${uuid}" name="F${id}"><Matrix>${at}</Matrix><GDTFSpec>${gdtf}</GDTFSpec>` +
    `<GDTFMode>${mode}</GDTFMode><FixtureID>${id}</FixtureID><FixtureIDNumeric>${id}</FixtureIDNumeric>` +
    `<UnitNumber>1</UnitNumber><Addresses>${addresses}</Addresses>${children}</Fixture>`
  );
}

/** A scene with one layer holding `children`. */
export const passScene = (children: string): string =>
  '<?xml version="1.0" encoding="UTF-8"?>\n<GeneralSceneDescription verMajor="1" verMinor="6"><Scene><AUXData/>' +
  `<Layers><Layer uuid="B0000000-0000-4000-8000-000000000001" name="L"><ChildList>${children}</ChildList></Layer>` +
  '</Layers></Scene></GeneralSceneDescription>\n';

/** A `.mvr` of `passScene(children)` with a placeholder spot GDTF and any `extra` files. */
export function passFile(children: string, extra: Readonly<Record<string, Uint8Array>> = {}): Uint8Array {
  return makeMvr(passScene(children), { 'Test@Spot.gdtf': new TextEncoder().encode('not a real gdtf'), ...extra });
}
