// @vitest-environment jsdom
/** Audit B2: a fixture nested in another fixture keeps its world pose when only its parent moved on the desk. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { walkScene } from '../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, passFile, passUuid as u, ROT90Z } from '../../../shared/index.ts';

const I = '{1,0,0}{0,1,0}{0,0,1}';
const A = (n: number): string => `<Address break="0">${n}</Address>`;
const sceneOf = (bytes: Uint8Array): Document =>
  parseXml(strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array()));
/** The world matrix of fixture `n` after an import of `bytes`. */
const world = (bytes: Uint8Array, n: number): number[] => [
  ...(walkScene(sceneOf(bytes)).fixtures.find((f) => f.uuid === u(n))?.matrix ?? []),
];
/** The largest difference of fixture `n`'s world matrix between two files, the move `by` (mm) taken off. */
function drift(a: Uint8Array, b: Uint8Array, n: number, by: readonly number[] = [0, 0, 0]): number {
  const [from, to] = [world(a, n), world(b, n)];
  expect(from).toHaveLength(16);
  return Math.max(
    ...to.map((value, i) => Math.abs(value - (from[i] ?? 0) - (i >= 12 && i < 15 ? (by[i - 12] ?? 0) : 0))),
  );
}
/** The export of `original` after the desk moved the fixtures in `ids` by one metre along X. */
async function moved(original: Uint8Array, ids: readonly number[]): Promise<Uint8Array> {
  const design: StageDesign = (await importMvr(original, { name: 'a.mvr' })).design;
  const fixtures = design.fixtures.map((f) =>
    ids.includes(f.id) ? { ...f, position: [f.position[0] + 1, f.position[1], f.position[2]] as const } : f,
  );
  return exportMvr({ ...design, fixtures }, { original }).bytes;
}
const matrixOf = (bytes: Uint8Array, n: number): string | null | undefined =>
  Array.from(sceneOf(bytes).getElementsByTagName('Fixture'))
    .find((el) => el.getAttribute('uuid') === u(n))
    ?.getElementsByTagName('Matrix')[0]?.textContent;

const child = fx(u(2), 2, { at: `${I}{0,500,-300}`, addresses: A(101) });
const nested = passFile(fx(u(1), 1, { at: `${ROT90Z}{1000,2000,6000}`, addresses: A(1), children: child }));
const STEP = [1000, 0, 0];

describe('pass-through export of nested fixtures (B2)', () => {
  it('keeps the world pose of a child whose parent fixture alone moved', async () => {
    const bytes = await moved(nested, [1]);
    expect(drift(nested, bytes, 1, STEP)).toBeLessThan(0.001);
    expect(drift(nested, bytes, 2)).toBeLessThan(0.001);
  });

  it('writes both moves when the parent and the child moved', async () => {
    const bytes = await moved(nested, [1, 2]);
    expect(drift(nested, bytes, 1, STEP)).toBeLessThan(0.001);
    expect(drift(nested, bytes, 2, STEP)).toBeLessThan(0.001);
  });

  it('leaves the parent text alone when only the child moved', async () => {
    const bytes = await moved(nested, [2]);
    expect(matrixOf(bytes, 1)).toBe(`${ROT90Z}{1000,2000,6000}`);
    expect(drift(nested, bytes, 2, STEP)).toBeLessThan(0.001);
  });

  it('keeps every unmoved fixture of three levels, through a group and a truss', async () => {
    const leaf = fx(u(3), 3, { at: `${ROT90Z}{10,20,30}`, addresses: A(201) });
    const truss = `<Truss uuid="D6000000-0000-4000-8000-000000000001" name="T"><Matrix>${I}{0,0,-200}</Matrix><ChildList>${leaf}</ChildList></Truss>`;
    const middle = fx(u(2), 2, { at: `${ROT90Z}{0,500,-300}`, addresses: A(101), children: truss });
    const group = `<GroupObject uuid="D0000000-0000-4000-8000-000000000001" name="G"><Matrix>${ROT90Z}{5,0,0}</Matrix><ChildList>${middle}</ChildList></GroupObject>`;
    const deep = passFile(fx(u(1), 1, { at: `${I}{1000,2000,6000}`, addresses: A(1), children: group }));
    const top = await moved(deep, [1]);
    expect([drift(deep, top, 1, STEP), drift(deep, top, 2), drift(deep, top, 3)].every((d) => d < 0.001)).toBe(true);
    const mid = await moved(deep, [2]);
    expect([drift(deep, mid, 1), drift(deep, mid, 2, STEP), drift(deep, mid, 3)].every((d) => d < 0.001)).toBe(true);
    const both = await moved(deep, [1, 3]);
    const ends = [drift(deep, both, 1, STEP), drift(deep, both, 2), drift(deep, both, 3, STEP)];
    expect(ends.every((d) => d < 0.001)).toBe(true);
  });
});
