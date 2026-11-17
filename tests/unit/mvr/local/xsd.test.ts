// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createTemplate, TEMPLATE_IDS } from '../../../../src/domain/stage/templates/index.ts';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { MVR_XSD_PATH } from '../../../../scripts/mvrXsdSource.ts';
import { gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../../shared/index.ts';
import { schemaErrors } from './schemaErrors.ts';

/**
 * Every export must be a valid MVR 1.6 scene, so other tools open it. The official mvr.xsd has no licence and is not
 * committed: run `npm run fetch:mvr-xsd` once to cache it, and this test skips until then (CI has no network).
 */
const HAS_XSD = existsSync(MVR_XSD_PATH);

/** A schema-valid uuid ending in `tail`: the export keeps the uuids it read, so the input must be valid too. */
const uuid = (tail: string): string => `00000000-0000-4000-8000-${tail.padStart(12, '0')}`;

/** A console-style file with a patched, an unpatched and a GDTF-less fixture: the cases an export writes apart. */
const THIRD_PARTY = makeMvr(
  sceneXml(
    `<Layer uuid="${uuid('1')}" name="Rig"><ChildList>
      ${fixture('101', 'Acme@Spot', '{40000,25000,8000}', '513')}
      ${fixture('102', 'Acme@Spot', '{42000,25000,8000}', '')}
      ${fixture('7', 'Ghost@Wash', '{41000,21000,500}', '1030')}
    </ChildList></Layer>`,
  ),
  {
    'Acme@Spot.gdtf': makeGdtf({
      geometries: '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>',
      modes: gdtfMode('Std', [['Dimmer', 'Offset="1"']]),
    }),
  },
);

/** One `<Fixture>` at `origin` (millimetres); `address` is absolute, empty for an unpatched fixture. */
function fixture(id: string, spec: string, origin: string, address: string): string {
  const addresses = address === '' ? '' : `<Addresses><Address break="0">${address}</Address></Addresses>`;
  return (
    `<Fixture uuid="${uuid(id)}" name="Light ${id}"><Matrix>{1,0,0}{0,1,0}{0,0,1}${origin}</Matrix>` +
    `<GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode><FixtureID>${id}</FixtureID>${addresses}</Fixture>`
  );
}

describe.skipIf(!HAS_XSD)('MVR export against mvr.xsd', () => {
  const xsd = HAS_XSD ? readFileSync(MVR_XSD_PATH, 'utf8') : '';

  it.each(TEMPLATE_IDS)('exports the %s template as a valid scene', async (id) => {
    expect(await schemaErrors(exportMvr(createTemplate(id)).bytes, xsd)).toEqual([]);
  });

  it('exports an imported third-party design as a valid scene', async () => {
    const { design } = await importMvr(THIRD_PARTY, { name: 'Console.mvr' });
    expect(await schemaErrors(exportMvr(design).bytes, xsd)).toEqual([]);
  });
});
