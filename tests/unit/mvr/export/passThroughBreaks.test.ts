// @vitest-environment jsdom
/** Second review, M-2, M-4 and the rest of H-2: breaks the desk does not model survive an unpatch and are sized. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, type MvrExportSummary } from '../../../../src/mvr/index.ts';
import { decodeAbsolute } from '../../../../src/mvr/patch/address.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, gdtfMode, loadNoDevices, makeGdtf, passFile, passUuid as u, SIZED_TYPE } from '../../../shared/index.ts';

type Fixture = StageDesign['fixtures'][number];
const sceneOf = (bytes: Uint8Array): Document =>
  parseXml(strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array()));
const addresses = (bytes: Uint8Array): string[] =>
  Array.from(sceneOf(bytes).getElementsByTagName('Address'), (el) => `${el.getAttribute('break')}=${el.textContent}`);
// the hoists of these files are fixtures the desk does not have, as in a show saved before the import kept devices
const load = loadNoDevices;
const unpatched = ({ patch: _patch, ...rest }: Fixture): Fixture => rest;
const at = (universe: number, address: number): NonNullable<Fixture['patch']> => ({ universe, address, mode: '' });
const A = (text: string, dmxBreak = 0): string => `<Address break="${dmxBreak}">${text}</Address>`;
const messages = (summary: MvrExportSummary): string => summary.warnings.map((warning) => warning.message).join('\n');
async function withAdded(original: Uint8Array, patch?: Fixture['patch']): Promise<[StageDesign, Fixture, Fixture]> {
  const design = await load(original);
  const first = design.fixtures[0];
  if (!first) throw new Error('no fixture');
  return [design, first, { ...unpatched(first), id: 50, ...(patch ? { patch } : {}) }];
}
const twoBreaks = passFile(fx(u(1), 1, { addresses: A('1.1') + A('1.300', 1) }));

describe('unpatching a multi-break fixture (M-2)', () => {
  it('keeps the fixture unpatched on the desk and the other break in the file through a re-import', async () => {
    const design = await load(twoBreaks);
    const first = exportMvr({ ...design, fixtures: design.fixtures.map(unpatched) }, { original: twoBreaks });
    const again = await load(first.bytes);
    expect(addresses(first.bytes)).toEqual(['1=1.300']);
    expect(again.fixtures.map((fixture) => fixture.patch)).toEqual([undefined]);
    expect(first.summary.report.warnings.map((item) => item.text)).toContain(
      '1 fixtures unpatched on the desk keep the addresses of their other breaks.',
    );
    const second = exportMvr(again, { original: first.bytes });
    expect(addresses(second.bytes)).toEqual(['1=1.300']);
    expect(second.summary.changes).toMatchObject({ updated: 0, unpatched: 0 });
  });

  it('writes a later desk patch into the desk break and leaves the kept break alone', async () => {
    const design = await load(twoBreaks);
    const first = exportMvr({ ...design, fixtures: design.fixtures.map(unpatched) }, { original: twoBreaks });
    const again = await load(first.bytes);
    const fixtures = again.fixtures.map((fixture) => ({ ...fixture, patch: at(2, 5) }));
    const { bytes } = exportMvr({ ...again, fixtures }, { original: first.bytes });
    expect(addresses(bytes)).toEqual(['0=517', '1=1.300']);
    expect((await load(bytes)).fixtures[0]?.patch).toMatchObject({ universe: 2, address: 5 });
  });
});

describe('kept addresses in the patch plan (H-2, M-4)', () => {
  it('reserves the file address of a fixture whose desk patch is out of range', async () => {
    const original = passFile(fx(u(1), 1, { addresses: A('1.1') }));
    const [design, first, added] = await withAdded(original);
    const { bytes } = exportMvr(
      {
        ...design,
        fixtures: [
          { ...first, patch: at(3, 600) },
          { ...added, type: SIZED_TYPE },
        ],
      },
      { original },
    );
    const [kept, fresh] = addresses(bytes).map((text) => decodeAbsolute(text.split('=')[1] ?? ''));
    expect(kept).toBe(1);
    expect(fresh).toBeGreaterThan(512);
  });

  it('sizes a kept fixture from its GDTF mode in the original, so a real overlap shows', async () => {
    const mode = gdtfMode('M', [
      ['Control1', 'Offset="1"'],
      ['Control2', 'Offset="30"'],
    ]);
    const hoist = fx(u(2), 2, { gdtf: 'Acme@Motor.gdtf', mode: 'M', addresses: A('1.1') });
    const original = passFile(fx(u(1), 1, { addresses: A('1.101') }) + hoist, {
      'Acme@Motor.gdtf': makeGdtf({ name: 'Motor', modes: mode }),
    });
    const [design, first, added] = await withAdded(original, at(1, 5));
    const { summary } = exportMvr({ ...design, fixtures: [first, added] }, { original });
    expect(design.fixtures.map((fixture) => fixture.id)).toEqual([1]);
    expect(messages(summary)).toMatch(/^Fixture 50 at 1\.5 (overlaps|may overlap) the channels of fixture 2\b/m);
    expect(summary.report.information.map((item) => item.text).join('\n')).not.toMatch(/count as 1 channel/);
  });

  it('warns that a desk patch may overlap a kept address of unknown size before it', async () => {
    const original = passFile(fx(u(1), 1, { addresses: A('2.1') + A('1.1', 1) }));
    const [design, first, added] = await withAdded(original, at(1, 5));
    const { summary } = exportMvr({ ...design, fixtures: [first, added] }, { original });
    expect(messages(summary)).toMatch(/^Fixture 50 at 1\.5 may overlap fixture 1, which the file keeps at 1\.1 in/m);
    expect(summary.report.information.map((item) => item.text).join('\n')).toMatch(
      /^1 kept addresses .* count as 1 channel/m,
    );
  });
});
