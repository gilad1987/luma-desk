// @vitest-environment jsdom
/** Third review, N1: the record of an unpatched fixture follows the element, not a desk id the next import changes. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, passFile, passUuid as u } from '../../../shared/index.ts';

type Fixture = StageDesign['fixtures'][number];
const addresses = (bytes: Uint8Array): string[] =>
  Array.from(
    parseXml(strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array())).getElementsByTagName(
      'Address',
    ),
    (el) => `${el.getAttribute('break')}=${el.textContent}`,
  );
const load = async (original: Uint8Array): Promise<StageDesign> =>
  (await importMvr(original, { name: 'a.mvr' })).design;
const unpatched = ({ patch: _patch, ...rest }: Fixture): Fixture => rest;
const A = (text: string, dmxBreak = 0): string => `<Address break="${dmxBreak}">${text}</Address>`;
/** A fixture as a file without usable ids writes it: the desk assigns its id in file order (D1). */
const noId = (n: number, addressList: string): string =>
  fx(u(n), n, { at: `{1,0,0}{0,1,0}{0,0,1}{${n * 1000},0,6000}`, addresses: addressList }).replace(
    /<FixtureID>\d+<\/FixtureID><FixtureIDNumeric>\d+<\/FixtureIDNumeric>/,
    '<FixtureID></FixtureID>',
  );

describe('unpatched fixture record by fixture key (N1)', () => {
  it('keeps the fixture unpatched when a deleted fixture before it renumbers the desk ids', async () => {
    const original = passFile(noId(1, A('1')) + noId(2, A('1.101') + A('1.300', 1)) + noId(3, A('201')));
    const design = await load(original);
    const [, second, third] = design.fixtures;
    if (!second || !third) throw new Error('no fixtures');
    const first = exportMvr({ ...design, fixtures: [unpatched(second), third] }, { original });
    const again = await load(first.bytes);
    expect(design.fixtures.map((fixture) => fixture.id)).toEqual([1, 2, 3]);
    expect(addresses(first.bytes)).toEqual(['1=1.300', '0=201']);
    expect(again.fixtures.map((fixture) => [fixture.id, fixture.patch !== undefined])).toEqual([
      [1, false],
      [2, true],
    ]);
    const second2 = exportMvr(again, { original: first.bytes });
    expect(addresses(second2.bytes)).toEqual(['1=1.300', '0=201']);
    expect(second2.summary.changes).toMatchObject({ updated: 0, unpatched: 0, added: 0, removed: 0 });
  });

  it('follows the element when twins share a uuid and the first twin is deleted', async () => {
    const twin = (n: number, list: string): string => noId(n, list).replace(u(n), u(7));
    const original = passFile(twin(1, A('1')) + twin(2, A('1.101') + A('1.300', 1)));
    const design = await load(original);
    const second = design.fixtures[1];
    if (!second) throw new Error('no fixture');
    const first = exportMvr({ ...design, fixtures: [unpatched(second)] }, { original });
    const again = await load(first.bytes);
    expect(addresses(first.bytes)).toEqual(['1=1.300']);
    expect(again.fixtures.map((fixture) => fixture.patch)).toEqual([undefined]);
  });
});
