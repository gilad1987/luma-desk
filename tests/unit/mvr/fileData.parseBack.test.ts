// @vitest-environment jsdom
/**
 * Whatever a file writes in the drawing data of a fixture, the design the import emits must load again: a saved show
 * whose `mvr` block the design parser rejects does not open. Every node is set, one at a time, to each edge value.
 */
import { describe, expect, it } from 'vitest';
import { parseStageDesign } from '../../../src/domain/stage/parse/parseStageDesign.ts';
import { importMvr } from '../../../src/mvr/index.ts';
import { customCommands, fileDataFixture, fileDataMvr } from '../../shared/index.ts';

const P1 = '77bcde16-95a6-4725-9d04-16a0bd67cd1a';
const AUX = `<Class uuid="${P1}" name="Lighting"/><Position uuid="${P1}" name=""/><Position name="No uuid"/>`;
const BOOLS = ['true', 'false', 'TRUE', '1', '', ' '];
const NUMBERS = ['0', '-1', 'NaN', 'abc', '', '1e999', '50', '1e300', '-1e300', '3.6e9', 'Infinity', '1e-300'];

const NODES: Readonly<Record<string, readonly string[]>> = {
  Color: ['0.3127,0.3290,100', '2.5,-5.1,3.6', '', 'abc', '0,0,0', '1e999,1,1', '0.3,0.3,NaN', '0.2,0.3,40', '1,2'],
  Position: ['', 'nope', P1, P1.toUpperCase()],
  Classing: ['', 'nope', P1],
  Function: ['', 'Key light', ' '],
  DMXInvertPan: BOOLS,
  DMXInvertTilt: BOOLS,
  CastShadow: BOOLS,
};
const COMMANDS = [
  ...NUMBERS.flatMap((value) => [`Body_Pan,f ${value}`, `/7/Head_Tilt.Tilt.Tilt/percent ,f ${value}`]),
  ...['', ' ', 'garbage', ',f 1', 'Body_Pan', 'Body_Pan,f'],
];
const CASES = [
  ...Object.entries(NODES).flatMap(([tag, values]) => values.map((value) => `<${tag}>${value}</${tag}>`)),
  ...COMMANDS.map((text) => customCommands(text, 'Yoke_Tilt,f 10')),
  '<CustomCommands/>',
];

/** The imported design as a saved show holds it, parsed back. */
async function parseBack(children: string) {
  const fixtures = [fileDataFixture('U-1', children), fileDataFixture('U-2', '<Color>0.4,0.4,50</Color>', { x: 1 })];
  const { design } = await importMvr(fileDataMvr(fixtures, AUX), { name: 'Edge.mvr' });
  const saved: unknown = JSON.parse(JSON.stringify(design));
  return { saved: saved as { mvr?: unknown }, result: parseStageDesign(saved) };
}

describe('the stored file data of any fixture loads again', () => {
  it.each(CASES)('parses back with %s', async (children) => {
    const { saved, result } = await parseBack(children);
    expect(result).toMatchObject({ ok: true });
    expect(result.ok ? result.design.mvr : undefined).toEqual(saved.mvr);
  });

  it('rejects a colour index that names no entry', async () => {
    const { saved } = await parseBack('<Color>0.3127,0.3290,100</Color>');
    const text = JSON.stringify(saved).replace('"color":0', '"color":-1');
    const result = parseStageDesign(JSON.parse(text));
    expect(result.ok ? [] : result.errors).toEqual([expect.stringContaining('expected a whole number from 0')]);
  });
});
