// @vitest-environment jsdom
/**
 * A fixture two levels below a moved fixture: its parent kept its world pose, so its own `<Matrix>` text stays as
 * the file has it, with no numeric noise. The moved fixture's local matrix under a turned group is clean too.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, passFile, passUuid as u, ROT90Z } from '../../../shared/index.ts';

const I = '{1,0,0}{0,1,0}{0,0,1}';
const A = (n: number): string => `<Address break="0">${n}</Address>`;
/** A turn of 30 degrees about Z. */
const ROT30Z = '{0.8660254037844387,0.5,0}{-0.5,0.8660254037844387,0}{0,0,1}';
const LEAF = `${I}{0,150.7,-100}`;

const f3 = fx(u(3), 3, { at: LEAF, addresses: A(201) });
const f2 = fx(u(2), 2, { at: `${ROT90Z}{300,0,-200}`, addresses: A(101), children: f3 });
const f1 = fx(u(1), 1, { at: `${I}{0,0,5000}`, addresses: A(1), children: f2 });
const group = `<GroupObject uuid="D0000000-0000-4000-8000-000000000001" name="G"><Matrix>${ROT30Z}{100,200,300}</Matrix><ChildList>${f1}</ChildList></GroupObject>`;
const original = passFile(group);

/** The `<Matrix>` texts by fixture number after the desk moved the fixtures in `ids` by one metre along X. */
async function matricesAfterMove(ids: readonly number[]): Promise<Record<number, string>> {
  const { design } = await importMvr(original, { name: 'deep.mvr' });
  const fixtures = design.fixtures.map((f) =>
    ids.includes(f.id) ? { ...f, position: [f.position[0] + 1, f.position[1], f.position[2]] as const } : f,
  );
  const { bytes } = exportMvr({ ...design, fixtures }, { original });
  const doc = parseXml(strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array()));
  const elements = Array.from(doc.getElementsByTagName('Fixture'));
  const textOf = (n: number): string =>
    elements.find((el) => el.getAttribute('uuid') === u(n))?.getElementsByTagName('Matrix')[0]?.textContent ?? '';
  return { 1: textOf(1), 2: textOf(2), 3: textOf(3) };
}

/** The numbers of a matrix text. */
const numbers = (text: string): string[] => text.match(/[^{},]+/g) ?? [];
/** The count of significant digits of a number text. */
const digits = (text: string): number => text.replace(/e.*$/, '').replace(/[-.]/g, '').replace(/^0+/, '').length;

describe('pass-through export three levels deep under a turned group', () => {
  it('keeps the text of a fixture whose parent kept its world pose', async () => {
    const after = await matricesAfterMove([1]);
    expect(after[3]).toBe(LEAF);
    expect(after[2]).not.toBe(`${ROT90Z}{300,0,-200}`);
  });

  it('writes the local matrix of the moved fixture without noise', async () => {
    const after = await matricesAfterMove([1]);
    expect(after[1]).toBe(`${I}{866.025403784,-500,5000}`);
    expect(numbers(after[2] ?? '').every((text) => digits(text) <= 12 && !text.includes('e'))).toBe(true);
  });

  it('keeps every text when nothing moved, and only rewrites the leaf when the leaf moved', async () => {
    expect(await matricesAfterMove([])).toEqual({ 1: `${I}{0,0,5000}`, 2: `${ROT90Z}{300,0,-200}`, 3: LEAF });
    const leaf = await matricesAfterMove([3]);
    expect([leaf[1], leaf[2]]).toEqual([`${I}{0,0,5000}`, `${ROT90Z}{300,0,-200}`]);
    expect(numbers(leaf[3] ?? '').every((text) => digits(text) <= 12 && !text.includes('e'))).toBe(true);
  });
});
