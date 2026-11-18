// @vitest-environment jsdom
/**
 * Owns the model a fixture gets when its GDTF file is missing: the keyword fallback, and the warning that names the
 * model.
 */
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../src/mvr/index.ts';
import { fallbackType } from '../../../src/mvr/import/fallbackType.ts';
import { makeMvr, sceneXml } from '../../shared/index.ts';

describe('fallbackType', () => {
  it('gives a bar to battens and a moving type to hybrids', () => {
    expect(fallbackType('Acme@Pixel Batten')).toBe('bar');
    expect(fallbackType('Acme@Mover Hybrid')).toBe('spot');
    expect(fallbackType('Acme@Ellipse Profile')).toBe('profile');
  });

  it('falls back to par when no keyword matches, and to par for an empty spec', () => {
    expect([fallbackType('Acme@Mystery 9'), fallbackType('')]).toEqual(['par', 'par']);
  });
});

describe('missing GDTF warning', () => {
  it('names the desk model the fixtures are shown as', async () => {
    const fixture = (uuid: string): string =>
      `<Fixture uuid="${uuid}" name="${uuid}"><GDTFSpec>Acme@Orbit Hybrid</GDTFSpec><GDTFMode>Std</GDTFMode></Fixture>`;
    const scene = sceneXml(
      `<Layer uuid="L1" name="Rig"><ChildList>${fixture('F1')}${fixture('F2')}</ChildList></Layer>`,
    );
    const result = await importMvr(makeMvr(scene, {}), { name: 'rig.mvr' });
    expect(result.design.fixtures.map((fixture) => fixture.type)).toEqual(['spot', 'spot']);
    expect(result.warnings.filter((warning) => warning.code === 'missing-gdtf').map((w) => w.message)).toEqual([
      '2 fixtures use the GDTF "Acme@Orbit Hybrid", which is not in the file; ' +
        'they are shown as the desk type "Spot".',
    ]);
  });

  it('keeps the imported GDTF name and mode on export, as the keyword type is the imported type', async () => {
    const fixture =
      '<Fixture uuid="F1" name="F1"><GDTFSpec>Acme@Orbit Wash</GDTFSpec>' + '<GDTFMode>Std</GDTFMode></Fixture>';
    const scene = sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${fixture}</ChildList></Layer>`);
    const first = await importMvr(makeMvr(scene, {}), { name: 'a.mvr' });
    const again = await importMvr(exportMvr(first.design).bytes, { name: 'b.mvr' });
    const info = Object.values(again.design.mvr?.fixtures ?? {});
    expect(info.map(({ gdtfName, gdtfMode, type }) => [gdtfName, gdtfMode, type])).toEqual([
      ['Acme@Orbit Wash', 'Std', 'wash'],
    ]);
  });
});
