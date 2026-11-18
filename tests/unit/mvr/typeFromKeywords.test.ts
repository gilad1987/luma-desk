// @vitest-environment jsdom
/**
 * Owns the model a fixture gets when its GDTF file is missing: the keyword table, its word matching and precedence,
 * and the warning that names the model.
 */
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../src/mvr/index.ts';
import { fallbackType } from '../../../src/mvr/import/fallbackType.ts';
import { typeFromKeywords } from '../../../src/mvr/gdtf/typeFromKeywords.ts';
import { makeMvr, sceneXml } from '../../shared/index.ts';

describe('typeFromKeywords', () => {
  it.each([
    ['Acme@Orbit Spot 400', 'spot'],
    ['Acme@Orbit Profile', 'spot'],
    ['Acme@Orbit Hybrid', 'spot'],
    ['Acme@Orbit Wash 19', 'wash'],
    ['Acme@Orbit Beam 7R', 'beam'],
    ['Acme@Glow Bar 12', 'bar'],
    ['Acme@Glow Batten', 'bar'],
    ['Acme@Glow Dot', 'bar'],
    ['Acme@Glow Pixel', 'bar'],
    ['Acme@Glow Line 1m', 'bar'],
    ['Acme@Flash Strobe', 'strobe'],
    ['Acme@Flash Blinder 2', 'blinder'],
    ['Acme@Glow Par 64', 'par'],
  ] as const)('maps "%s" to %s', (name, type) => {
    expect(typeFromKeywords(name)).toBe(type);
  });

  it('ignores case and finds words split by digits, punctuation, underscores or camel case', () => {
    expect(
      ['acme@orbit SPOT', 'Acme_WASH_1', 'Acme@Par64', 'Acme@LEDBeam 150', 'Acme@SixBar'].map(typeFromKeywords),
    ).toEqual(['spot', 'wash', 'par', 'beam', 'bar']);
  });

  it('matches whole words only, so "par" in "sparkle" or "bar" in "barrel" is no match', () => {
    expect(
      ['Acme@Sparkle', 'Acme@Barrel', 'Acme@Spotless', 'Acme@Washer', 'Acme@Outline'].map(typeFromKeywords),
    ).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });

  it('gives body words (strobe, blinder, par, bar group) precedence over light words, in table order', () => {
    expect(
      ['Acme@Wash Par', 'Acme@Beam Bar', 'Acme@Hybrid Strobe', 'Acme@Strobe Blinder', 'Acme@Pixel Par'].map(
        typeFromKeywords,
      ),
    ).toEqual(['par', 'bar', 'strobe', 'strobe', 'par']);
    expect(['Acme@Beam Wash', 'Acme@Wash Spot', 'Acme@Spot Hybrid'].map(typeFromKeywords)).toEqual([
      'beam',
      'wash',
      'spot',
    ]);
  });
});

describe('fallbackType', () => {
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
      '2 fixture(s) use the GDTF "Acme@Orbit Hybrid", which is not in the file; they are shown as the desk type "Spot".',
    ]);
  });

  it('keeps the imported GDTF name and mode on export, as the keyword type is the imported type', async () => {
    const fixture = `<Fixture uuid="F1" name="F1"><GDTFSpec>Acme@Orbit Wash</GDTFSpec><GDTFMode>Std</GDTFMode></Fixture>`;
    const scene = sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${fixture}</ChildList></Layer>`);
    const first = await importMvr(makeMvr(scene, {}), { name: 'a.mvr' });
    const again = await importMvr(exportMvr(first.design).bytes, { name: 'b.mvr' });
    const info = Object.values(again.design.mvr?.fixtures ?? {});
    expect(info.map(({ gdtfName, gdtfMode, type }) => [gdtfName, gdtfMode, type])).toEqual([
      ['Acme@Orbit Wash', 'Std', 'wash'],
    ]);
  });
});
