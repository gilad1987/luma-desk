// @vitest-environment jsdom
/** Second review, H-1 and H-2: no invented GDTF type, and no added fixture on the address of a kept break. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { TYPES } from '../../../../src/domain/fixtureTypes/index.ts';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { decodeAbsolute } from '../../../../src/mvr/patch/address.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, passFile, passUuid as u, SIZED_TYPE } from '../../../shared/index.ts';

type Fixture = StageDesign['fixtures'][number];
const sceneOf = (bytes: Uint8Array): Document =>
  parseXml(strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array()));
const texts = (bytes: Uint8Array, tag: string): (string | null)[] =>
  Array.from(sceneOf(bytes).getElementsByTagName(tag), (el) => el.textContent);
const load = async (original: Uint8Array): Promise<StageDesign> =>
  (await importMvr(original, { name: 'a.mvr' })).design;
const unpatched = ({ patch: _patch, ...rest }: Fixture): Fixture => rest;
/** A fixture as some writers leave it: placed, numbered and patched, with `gdtf` as its only type children. */
const typeless = (gdtf: string): string =>
  `<Fixture uuid="${u(3)}" name="F3"><Matrix>{1,0,0}{0,1,0}{0,0,1}{2000,0,6000}</Matrix>${gdtf}` +
  '<FixtureID>3</FixtureID><FixtureIDNumeric>3</FixtureIDNumeric>' +
  '<Addresses><Address break="0">201</Address></Addresses></Fixture>';
const otherType = (design: StageDesign): Fixture['type'] => {
  const found = Object.keys(TYPES).find(
    (type) => type !== design.fixtures[0]?.type && TYPES[type as keyof typeof TYPES].gdtfSpec,
  );
  return found as Fixture['type'];
};

describe('pass-through GDTF type (H-1)', () => {
  it('writes no GDTFSpec and no GDTFMode for an unchanged fixture the file gave none', async () => {
    const original = passFile(typeless(''));
    const { bytes, summary } = exportMvr(await load(original), { original });
    expect([texts(bytes, 'GDTFSpec'), texts(bytes, 'GDTFMode')]).toEqual([[], []]);
    expect(summary.changes?.updated).toBe(0);
  });

  it('keeps an empty GDTFMode beside a named GDTFSpec', async () => {
    const original = passFile(typeless('<GDTFSpec>Test@Spot.gdtf</GDTFSpec><GDTFMode></GDTFMode>'));
    const { bytes, summary } = exportMvr(await load(original), { original });
    expect([texts(bytes, 'GDTFSpec'), texts(bytes, 'GDTFMode')]).toEqual([['Test@Spot.gdtf'], ['']]);
    expect(summary.changes?.updated).toBe(0);
  });

  it('keeps a GDTFSpec whose file is not in the archive, mode included', async () => {
    const original = passFile(typeless('<GDTFSpec>Nobody@Thing.gdtf</GDTFSpec><GDTFMode>X</GDTFMode>'));
    const { bytes, summary } = exportMvr(await load(original), { original });
    expect([texts(bytes, 'GDTFSpec'), texts(bytes, 'GDTFMode')]).toEqual([['Nobody@Thing.gdtf'], ['X']]);
    expect(summary.changes?.updated).toBe(0);
  });

  it('writes the new GDTF once the user re-typed a fixture the file gave none', async () => {
    const original = passFile(typeless(''));
    const design = await load(original);
    const type = otherType(design);
    const fixtures = design.fixtures.map((fixture) => ({ ...fixture, type }));
    const { bytes, summary } = exportMvr({ ...design, fixtures }, { original });
    expect(texts(bytes, 'GDTFSpec')).toEqual([TYPES[type].gdtfSpec]);
    expect(texts(bytes, 'GDTFMode')).toHaveLength(1);
    expect(summary.changes?.updated).toBe(1);
  });
});

describe('pass-through kept breaks (H-2)', () => {
  it('keeps the other break of an unpatched fixture out of the auto-patch', async () => {
    const original = passFile(
      fx(u(1), 1, { addresses: '<Address break="0">1.1</Address><Address break="1">2.1</Address>' }),
    );
    const design = await load(original);
    const first = design.fixtures[0];
    if (!first) throw new Error('no fixture');
    const fixtures = [unpatched(first), { ...unpatched(first), id: 50, type: SIZED_TYPE }];
    const { bytes, summary } = exportMvr({ ...design, fixtures }, { original });
    const [kept, added] = texts(bytes, 'Address').map((text) => decodeAbsolute(text ?? ''));
    expect(kept).toBe(513);
    expect(added).toBeGreaterThan(1024);
    expect(summary.autoPatched).toBe(1);
  });
});
