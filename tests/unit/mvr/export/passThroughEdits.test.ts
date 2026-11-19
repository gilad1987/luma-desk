// @vitest-environment jsdom
/** Review fixes H2 and the missing cases: patch collisions, a move in a rotated group, re-type and renumber. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { decodeAbsolute } from '../../../../src/mvr/patch/address.ts';
import { walkScene } from '../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, passFile, passUuid as u, ROT90Z, SIZED_TYPE } from '../../../shared/index.ts';

const sceneOf = (bytes: Uint8Array): Document =>
  parseXml(strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array()));
const texts = (bytes: Uint8Array, tag: string): (string | null)[] =>
  Array.from(sceneOf(bytes).getElementsByTagName(tag), (el) => el.textContent);
const load = async (original: Uint8Array): Promise<StageDesign> =>
  (await importMvr(original, { name: 'a.mvr' })).design;
const twoBreaks = passFile(
  fx(u(1), 1, { addresses: '<Address break="0">1.1</Address><Address break="1">2.1</Address>' }),
);

describe('pass-through desk edits', () => {
  it('patches an added fixture above every kept break of the file (H2)', async () => {
    const design = await load(twoBreaks);
    const first = design.fixtures[0];
    if (!first) throw new Error('no fixture');
    const bare = (({ patch: _patch, ...rest }: StageDesign['fixtures'][number]) => rest)(first);
    const { bytes, summary } = exportMvr(
      { ...design, fixtures: [first, { ...bare, id: 50, type: SIZED_TYPE }] },
      { original: twoBreaks },
    );
    const added = decodeAbsolute(texts(bytes, 'Address')[2] ?? '') ?? 0;
    expect(added).toBeGreaterThan(1024);
    expect(summary.autoPatched).toBe(1);
  });

  it('writes a move inside a rotated group back into the group frame', async () => {
    const deep = fx(u(3), 3, { at: '{1,0,0}{0,1,0}{0,0,1}{1000,2000,3000}', addresses: '<Address>1</Address>' });
    const group = `<GroupObject uuid="D0000000-0000-4000-8000-000000000001" name="G"><Matrix>${ROT90Z}{5000,0,0}</Matrix><ChildList>${deep}</ChildList></GroupObject>`;
    const original = passFile(group);
    const design = await load(original);
    const fixtures = design.fixtures.map((f) => ({
      ...f,
      position: [f.position[0] + 1, f.position[1], f.position[2]] as const,
    }));
    const world = (bytes: Uint8Array): number[] => [
      ...(walkScene(sceneOf(bytes)).fixtures[0]?.matrix.slice(12, 15) ?? []),
    ];
    const delta = world(exportMvr({ ...design, fixtures }, { original }).bytes).map((v, i) =>
      Math.round(v - (world(original)[i] ?? 0)),
    );
    expect(delta).toEqual([1000, 0, 0]);
  });

  it('writes the desk GDTF of a re-typed fixture', async () => {
    const design = await load(twoBreaks);
    const other = Object.keys(TYPES).find(
      (type) => type !== design.fixtures[0]?.type && TYPES[type as keyof typeof TYPES].gdtfSpec,
    );
    const fixtures = design.fixtures.map((f) => ({ ...f, type: other as typeof f.type }));
    const spec = texts(exportMvr({ ...design, fixtures }, { original: twoBreaks }).bytes, 'GDTFSpec')[0];
    expect(spec).not.toBe('Test@Spot.gdtf');
    expect(spec).toBe(TYPES[other as keyof typeof TYPES].gdtfSpec);
  });

  it('writes a renumbered id to FixtureID and FixtureIDNumeric', async () => {
    const design = await load(twoBreaks);
    const info = design.mvr?.fixtures['1'];
    if (!design.mvr || !info) throw new Error('no MVR facts');
    const renumbered = {
      ...design,
      mvr: { ...design.mvr, fixtures: { '77': info } },
      fixtures: design.fixtures.map((f) => ({ ...f, id: 77 })),
    };
    const { bytes } = exportMvr(renumbered, { original: twoBreaks });
    expect([texts(bytes, 'FixtureID'), texts(bytes, 'FixtureIDNumeric')]).toEqual([['77'], ['77']]);
  });
});
