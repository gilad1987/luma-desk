// @vitest-environment jsdom
/** Audit B5 and C8: a moved fixture keeps the scale or mirror of its file matrix; rewritten numbers round-trip. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { preciseMatrix } from '../../../../src/mvr/export/passThrough/preciseMatrix.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { readMvrMatrix } from '../../../../src/mvr/math/Mat4.ts';
import { walkScene } from '../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, passFile, passUuid as u } from '../../../shared/index.ts';

const A = '<Address break="0">1</Address>';
const sceneOf = (bytes: Uint8Array): Document =>
  parseXml(strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array()));
const matrixText = (bytes: Uint8Array): string | null | undefined =>
  sceneOf(bytes).getElementsByTagName('Fixture')[0]?.getElementsByTagName('Matrix')[0]?.textContent;
const world = (bytes: Uint8Array): number[] => [...(walkScene(sceneOf(bytes)).fixtures[0]?.matrix ?? [])];
/** The export of `original`, its one fixture moved by `metres` along X on the desk. */
async function exported(original: Uint8Array, metres: number): Promise<Uint8Array> {
  const { design } = await importMvr(original, { name: 'a.mvr' });
  const fixtures = design.fixtures.map((f) => ({
    ...f,
    position: [f.position[0] + metres, f.position[1], f.position[2]] as const,
  }));
  return exportMvr({ ...design, fixtures }, { original }).bytes;
}

describe('pass-through export of a scaled or mirrored fixture matrix (B5)', () => {
  it.each([
    ['scaled', '{2,0,0}{0,2,0}{0,0,2}'],
    ['scaled per axis', '{2,0,0}{0,0.5,0}{0,0,3}'],
    ['mirrored', '{1,0,0}{0,1,0}{0,0,-1}'],
    ['mirrored and turned', '{0,1,0}{1,0,0}{0,0,1}'],
  ])('keeps a %s matrix untouched without a move and its 3x3 part after one', async (_name, axes) => {
    const original = passFile(fx(u(1), 1, { at: `${axes}{1000,2000,6000}`, addresses: A }));
    expect(matrixText(await exported(original, 0))).toBe(`${axes}{1000,2000,6000}`);
    expect(matrixText(await exported(original, 1))).toBe(`${axes}{2000,2000,6000}`);
  });
});

describe('numbers of a rewritten matrix (C8)', () => {
  it('writes each number so that it reads back to the same float', () => {
    const values = [1 / 3, 0.0008660254037844387, -1234567.000000001, 6.123233995736766e-17, -0, 1e21, 0.1 + 0.2];
    const m = new Float64Array(16);
    m.set([...values, 0, 0], 0);
    m[15] = 1;
    const back = readMvrMatrix(preciseMatrix(m));
    const cells = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14];
    expect(cells.map((i) => back?.[i])).toEqual(cells.map((i) => (m[i] ?? 0) + 0));
    expect(preciseMatrix(m)).not.toContain('-0,');
  });

  it('keeps the orientation of a fixture moved inside a group scaled by 1000', async () => {
    const [cos, sin] = [866.0254037844387, 500];
    const group = `{${cos},${sin},0}{${-sin},${cos},0}{0,0,1000}{3,4,5}`;
    const inner = fx(u(1), 1, { at: '{0.001,0,0}{0,0.001,0}{0,0,0.001}{1,2,6}', addresses: A });
    const original = passFile(
      `<GroupObject uuid="D0000000-0000-4000-8000-000000000001" name="G"><Matrix>${group}</Matrix>` +
        `<ChildList>${inner}</ChildList></GroupObject>`,
    );
    const [before, after] = [world(original), world(await exported(original, 1))];
    const moved = after.map((value, i) => value - (before[i] ?? 0) - (i === 12 ? 1000 : 0));
    expect(before).toHaveLength(16);
    expect(Math.max(...moved.slice(0, 12).map(Math.abs))).toBeLessThan(1e-8);
    expect(Math.max(...moved.slice(12, 15).map(Math.abs))).toBeLessThan(1e-5);
  });
});
