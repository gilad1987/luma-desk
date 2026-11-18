// @vitest-environment jsdom
/**
 * GDTF spec and mode names keep their spaces through an import, with or without the GDTF file in the archive, so an
 * export writes the exact name the GDTF holds ("GDTFMode has to match the name of a DMXMode").
 */
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../shared/index.ts';

const MODE = 'Full Access Extended Mode ';
const DESK_SPEC = 'Robe Lighting@Robin Tetra2.gdtf';

const fixture = (spec: string, mode: string): string =>
  `<Fixture uuid="F1" name="F1"><GDTFSpec>${spec}</GDTFSpec><GDTFMode>${mode}</GDTFMode>` +
  '<Addresses><Address break="0">1</Address></Addresses></Fixture>';

const mvrOf = (spec: string, mode: string, files: Readonly<Record<string, Uint8Array>> = {}): Uint8Array =>
  makeMvr(sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${fixture(spec, mode)}</ChildList></Layer>`), files);

describe('GDTF names on import', () => {
  it('keeps the mode name spaces when the GDTF file is in the archive', async () => {
    const gdtf = makeGdtf({ geometries: '<Geometry Name="Body"/>', modes: gdtfMode(MODE, [['Dimmer', 'Offset="1"']]) });
    const { design, warnings } = await importMvr(mvrOf('Acme@Spot', MODE, { 'Acme@Spot.gdtf': gdtf }), { name: 'x' });
    expect(design.fixtures[0]?.patch?.mode).toBe(MODE);
    expect(warnings.filter((w) => w.code === 'unknown-mode')).toEqual([]);
  });

  it('keeps the mode name spaces from the scene text when the GDTF file is not in the archive', async () => {
    const { design } = await importMvr(mvrOf(DESK_SPEC, MODE), { name: 'x' });
    expect(design.fixtures[0]?.patch?.mode).toBe(MODE);
  });

  it('warns once for a GDTF without modes when its fixtures name the mode as "" and as blanks', async () => {
    const gdtf = makeGdtf({ geometries: '<Geometry Name="Body"/>', modes: '' });
    const scene = sceneXml(
      `<Layer uuid="L1" name="Rig"><ChildList>${fixture('Acme@Spot', '')}${fixture('Acme@Spot', '  ').replace(
        /F1/g,
        'F2',
      )}</ChildList></Layer>`,
    );
    const { warnings } = await importMvr(makeMvr(scene, { 'Acme@Spot.gdtf': gdtf }), { name: 'x' });
    expect(warnings.filter((w) => w.code === 'unknown-mode')).toHaveLength(1);
  });

  it('still finds the GDTF file of an indented spec', async () => {
    const gdtf = makeGdtf({ geometries: '<Geometry Name="Body"/>', modes: gdtfMode('Std', []) });
    const { summary } = await importMvr(mvrOf('\n  Acme@Spot\n', 'Std', { 'Acme@Spot.gdtf': gdtf }), { name: 'x' });
    expect(summary.missingGdtfCount).toBe(0);
  });
});
