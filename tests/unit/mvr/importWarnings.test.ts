// @vitest-environment jsdom
/**
 * Warning noise of the import: a missing GDTF that names a desk type (a luma export embeds none) is no problem, an
 * unknown one still is, and an unknown mode is reported once per GDTF file and mode, not once per fixture.
 */
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { gdtfMode, makeGdtf, makeMvr, sceneXml } from '../../shared/index.ts';

const BEAM = '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="20"/></Geometry>';

const fixture = (uuid: string, spec: string, mode: string): string =>
  `<Fixture uuid="${uuid}" name="${uuid}"><GDTFSpec>${spec}</GDTFSpec><GDTFMode>${mode}</GDTFMode></Fixture>`;

/** An MVR with the given fixtures and one readable GDTF, `Acme@Spot.gdtf`, whose only mode is `Std`. */
const mvrOf = (fixtures: readonly string[]): Uint8Array =>
  makeMvr(sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${fixtures.join('')}</ChildList></Layer>`), {
    'Acme@Spot.gdtf': makeGdtf({ geometries: BEAM, modes: gdtfMode('Std', [['Dimmer', 'Offset="1"']]) }),
  });

describe('import warnings', () => {
  it('maps a missing desk GDTF to its type without a warning, and warns for an unknown one', async () => {
    const bytes = mvrOf([
      fixture('A', 'Robe@Robin MegaPointe@r3038.gdtf', '1'),
      fixture('B', 'robe@robin megapointe@r3038', '1'),
      fixture('C', 'Ghost@Wash', ''),
    ]);
    const { design, summary, warnings } = await importMvr(bytes, { name: 'x' });
    expect(design.fixtures.map((f) => f.type)).toEqual(['beam', 'beam', 'par']);
    expect(summary.missingGdtfCount).toBe(1);
    expect(warnings.filter((w) => w.code === 'missing-gdtf').map((w) => w.ref)).toEqual(['Ghost@Wash']);
  });

  it('gives one unknown-mode warning per GDTF file and requested mode', async () => {
    const bytes = mvrOf([
      fixture('A', 'Acme@Spot', 'Nope'),
      fixture('B', 'Acme@Spot', 'Nope'),
      fixture('C', 'Acme@Spot', ''),
      fixture('D', 'Acme@Spot', 'Nope'),
      fixture('E', 'Acme@Spot', 'Std'),
    ]);
    const { warnings } = await importMvr(bytes, { name: 'x' });
    const unknown = warnings.filter((w) => w.code === 'unknown-mode');
    expect(unknown.map((w) => w.ref)).toEqual(['A', 'C']);
    expect(unknown[0]?.message).toContain('"Nope"');
  });

  it('gives one ambiguous-gdtf warning per spec that matches several files', async () => {
    const gdtf = makeGdtf({ geometries: BEAM, modes: gdtfMode('Std', []) });
    const fixtures = fixture('A', 'Spot', 'Std') + fixture('B', 'Spot', 'Std');
    const scene = `<Layer uuid="L1" name="Rig"><ChildList>${fixtures}</ChildList></Layer>`;
    const bytes = makeMvr(sceneXml(scene), { 'Zeta@Spot.gdtf': gdtf, 'Acme@Spot.gdtf': gdtf });
    const { warnings } = await importMvr(bytes, { name: 'x' });
    const ambiguous = warnings.filter((w) => w.code === 'ambiguous-gdtf');
    expect(ambiguous.map((w) => w.ref)).toEqual(['Spot']);
    expect(ambiguous[0]?.message).toContain('"Acme@Spot.gdtf" is used, not "Zeta@Spot.gdtf"');
  });
});
