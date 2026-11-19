// @vitest-environment jsdom
/**
 * The plain writer writes every piece of file data the design holds of a `<Fixture>`, at its place in the child order
 * of the MVR 1.6 Table 26, and its loss report names only what is really lost. All names are invented.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { CLASS, EVERY, FLAGS, HELD, heldDesign, POSITION } from './heldFileData.ts';

describe('the plain writer on a design that holds every file field', () => {
  const { bytes, summary } = exportMvr(heldDesign());
  const xml = strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array());
  const fixtures = Array.from(parseXml(xml).getElementsByTagName('Fixture'));
  const children = (index: number): string[] => Array.from(fixtures[index]?.children ?? []).map((el) => el.localName);
  const text = (index: number, tag: string): string | null | undefined =>
    Array.from(fixtures[index]?.children ?? []).find((el) => el.localName === tag)?.textContent;

  it('writes each held node once, in the child order of Table 26', () => {
    const order = 'Matrix Classing GDTFSpec GDTFMode CastShadow DMXInvertPan DMXInvertTilt Position Function';
    const rest = 'FixtureID FixtureIDNumeric UnitNumber Addresses CustomCommands Color CustomIdType CustomId';
    expect(children(0).join(' ')).toBe(`${order} ${rest}`);
    expect(['Classing', 'Position', 'Function', 'Color'].map((tag) => text(0, tag))).toEqual([
      CLASS,
      POSITION,
      'Key <light>',
      '0.2,0.3,40',
    ]);
    expect(['CastShadow', 'DMXInvertPan', 'DMXInvertTilt'].map((tag) => text(0, tag))).toEqual([
      'false',
      'true',
      'true',
    ]);
    expect(xml).toContain(
      '<CustomCommands><CustomCommand>Body_Pan,f 45</CustomCommand><CustomCommand>Yoke_Tilt,f -30</CustomCommand>' +
        '<CustomCommand>/1/Body_Zoom/percent ,f 20</CustomCommand></CustomCommands><Color>0.2,0.3,40</Color>',
    );
  });

  it('writes the Position and the Class of AUXData with the uuid and the name of the file', () => {
    expect(xml).toContain(
      `<Position uuid="${POSITION}" name="Front truss"/><Class uuid="${CLASS}" name="Lighting &amp; more"/></AUXData>`,
    );
    expect(xml.match(/<(Position|Class) /g)).toHaveLength(2);
  });

  it('writes no dangling reference and no command of a fixture with another type, and counts both', () => {
    expect(children(1).join(' ')).toBe(
      'Matrix GDTFSpec GDTFMode CastShadow FixtureID FixtureIDNumeric UnitNumber Addresses',
    );
    expect(children(2)).toContain('Color');
    expect(children(2)).not.toContain('CustomCommands');
    const losses = summary.report.losses.map((item) => item.text);
    expect(losses[1]).not.toMatch(/classes|positions|colou?r/i);
    expect(losses.slice(2)).toEqual([
      '1 fixtures named a class or a position that the file did not define; those references are not in this export.',
      '1 fixtures have another type than in the file; their CustomCommands address the GDTF of the file and are not ' +
        'in this export.',
      "1 fixtures: the rest aim changed on the desk; the file's pan and tilt commands are not written.",
    ]);
  });

  it('writes the pan and tilt commands while the rest aim is the one of the file, and not after a change', () => {
    const commands = (index: number): (string | null)[] =>
      Array.from(fixtures[index]?.getElementsByTagName('CustomCommand') ?? []).map((el) => el.textContent);
    expect(commands(0)).toEqual(HELD.commandSets?.[0]);
    expect(commands(3)).toEqual(HELD.commandSets?.[0]);
    expect(commands(4)).toEqual(['/1/Body_Zoom/percent ,f 20']);
  });

  it('reads the same file data back from the written file', async () => {
    const { design } = await importMvr(bytes, { name: 'show.mvr' });
    const first = Object.values(design.mvr?.fixtures ?? {})[0];
    expect(first).toMatchObject({ ...EVERY, ...FLAGS, customId: 5 });
    expect(design.mvr?.colors?.map((color) => color.xyY)).toEqual(HELD.colors?.map((color) => color.xyY));
    expect(design.mvr?.commandSets).toEqual([...(HELD.commandSets ?? []), ['/1/Body_Zoom/percent ,f 20']]);
    expect(design.mvr?.positions).toEqual([{ uuid: POSITION, name: 'Front truss' }]);
    expect(design.mvr?.classes).toEqual([{ uuid: CLASS, name: 'Lighting & more' }]);
  });
});
