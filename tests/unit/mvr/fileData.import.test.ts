// @vitest-environment jsdom
/**
 * The import reads the drawing data of a `<Fixture>` (MVR 1.6, Table 26: Color, CustomCommands, Position, Classing,
 * Function, DMXInvertPan, DMXInvertTilt, CastShadow) and stores it, with the shared values in tables of the design.
 * A fixture without these nodes gets no new key. All names are invented.
 */
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { customCommands, fileDataFixture, fileDataMvr } from '../../shared/index.ts';

const P1 = '77bcde16-95a6-4725-9d04-16a0bd67cd1a';
/** The same uuid as the spec's own Fixture example writes references: spaced byte pairs. */
const P1_SPACED = '77 BC DE 16 95 A6 47 25 9D 04 16 A0 BD 67 CD 1A';
const C1 = '4ab19462-a6e3-4c3b-b25a-d8099f78170c';
const AUX = `<Class uuid="${C1}" name="Lighting"/><Position uuid="${P1}" name="LX 1"/>`;
const WHITE = '<Color>0.3127,0.3290,100</Color>';

const A =
  `${WHITE}${customCommands('Body_Pan,f 45', 'Yoke_Tilt,f -30', 'Body_Zoom,f 20')}<Position>${P1}</Position>` +
  `<Classing>${C1}</Classing><Function>Key</Function><DMXInvertPan>true</DMXInvertPan><CastShadow>false</CastShadow>`;
const B = `<Color>0.64,0.33,21.26</Color><Position>${P1_SPACED}</Position><DMXInvertTilt>TRUE</DMXInvertTilt>`;
const GONE = '00000000-0000-4000-8000-000000000001';
const C = `${WHITE}<Position>${GONE}</Position><Classing>nope</Classing>`;
const D = '<Color>2.533316,-5.175210,3.699302</Color><DMXInvertPan>false</DMXInvertPan><CastShadow>true</CastShadow>';

const BYTES = fileDataMvr(
  [A, B, C, D, ''].map((children, index) => fileDataFixture(`U-${index}`, children, { x: index })),
  AUX,
);

async function imported() {
  const { design, warnings } = await importMvr(BYTES, { name: 'File data.mvr' });
  const infos = new Map(Object.values(design.mvr?.fixtures ?? {}).map((info) => [info.uuid, info]));
  return { mvr: design.mvr, infos, warnings };
}

describe('importMvr stores the file data of a fixture', () => {
  it('keeps every node the file gives, as stated', async () => {
    const { mvr, infos } = await imported();
    const first = { color: 0, commands: 0, position: 0, classing: 0 };
    expect(infos.get('U-0')).toMatchObject({ ...first, fixtureFunction: 'Key', dmxInvertPan: true, castShadow: false });
    expect(mvr?.commandSets).toEqual([['Body_Pan,f 45', 'Yoke_Tilt,f -30', 'Body_Zoom,f 20']]);
    expect(infos.get('U-1')).toMatchObject({ color: 1, position: 1, dmxInvertTilt: true });
    expect(infos.get('U-3')).toMatchObject({ castShadow: true });
    expect(Object.keys(infos.get('U-3') ?? {})).not.toContain('dmxInvertPan');
  });

  it('shares each colour, position and class in a table of the design', async () => {
    const { mvr, infos } = await imported();
    expect(mvr?.colors?.map((color) => color.xyY)).toEqual([
      [0.3127, 0.329, 100],
      [0.64, 0.33, 21.26],
    ]);
    const [white, red] = (mvr?.colors ?? []).map((color) => color.rgb.map((part) => Math.round(part * 100) / 100));
    expect([white, red]).toEqual([
      [1, 1, 1],
      [1, 0, 0],
    ]);
    expect(infos.get('U-2')?.color).toBe(0);
    expect(mvr?.positions).toEqual([{ uuid: P1, name: 'LX 1' }, { uuid: P1_SPACED, name: 'LX 1' }, { uuid: GONE }]);
    expect(mvr?.classes).toEqual([{ uuid: C1, name: 'Lighting' }, { uuid: 'nope' }]);
  });

  it('keeps a dangling reference on the fixture and reports each cause in one grouped line', async () => {
    const { infos, warnings } = await imported();
    expect(infos.get('U-2')).toMatchObject({ position: 2, classing: 1 });
    const lines = warnings.filter((warning) => /^(dangling|bad-color)/.test(warning.code));
    expect(lines.map((line) => [line.code, line.refs])).toEqual([
      ['dangling-position', ['U-2']],
      ['dangling-class', ['U-2']],
      ['bad-color', ['U-3']],
    ]);
    expect(lines[0]?.message).toContain('is named by 1 fixture;');
  });

  it('adds no key to a fixture, and no table to a design, without these nodes', async () => {
    const { infos } = await imported();
    expect(Object.keys(infos.get('U-4') ?? {}).sort()).toEqual(['gdtfMode', 'gdtfName', 'layer', 'type', 'uuid']);
    const plain = await importMvr(fileDataMvr([fileDataFixture('U-1', '')]), { name: 'Plain.mvr' });
    expect(Object.keys(plain.design.mvr ?? {}).sort()).toEqual([
      'fixtures',
      'hiddenLayers',
      'imported',
      'layers',
      'offset',
    ]);
    expect(plain.warnings.filter((warning) => /^(dangling|bad-color)/.test(warning.code))).toEqual([]);
  });
});
