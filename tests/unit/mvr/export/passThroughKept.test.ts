// @vitest-environment jsdom
/** Third review, N2, N3 and N6: break numbers, quiet neighbours the file already had, and names in the messages. */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, type MvrExportSummary } from '../../../../src/mvr/index.ts';
import { fx, gdtfMode, loadNoDevices, makeGdtf, passFile, passUuid as u } from '../../../shared/index.ts';

type Fixture = StageDesign['fixtures'][number];
type Lines = MvrExportSummary['report']['warnings'];
const flat = (lines: Lines): string =>
  lines.flatMap((item) => (item.all.length > 0 ? item.all : [item.text])).join('\n');
// the hoists of these files are fixtures the desk does not have, as in a show saved before the import kept devices
const load = loadNoDevices;
const at = (universe: number, address: number): NonNullable<Fixture['patch']> => ({ universe, address, mode: '' });
const A = (text: string, dmxBreak = 0): string => `<Address break="${dmxBreak}">${text}</Address>`;
const hoist = (addressList: string): string =>
  fx(u(2), 2, { gdtf: 'Acme@Motor.gdtf', mode: 'M', addresses: addressList });
const motor = (second: string): Record<string, Uint8Array> => ({
  'Acme@Motor.gdtf': makeGdtf({
    name: 'Motor',
    modes: gdtfMode('M', [
      ['Control1', 'Offset="4"'],
      ['Control2', second],
    ]),
  }),
});
/** The summary of `original` exported with a copy of its first desk fixture added as fixture 50 at `patch`. */
async function withAdded(original: Uint8Array, patch: Fixture['patch']): Promise<MvrExportSummary> {
  const design = await load(original);
  const first = design.fixtures[0];
  if (!first) throw new Error('no fixture');
  return exportMvr({ ...design, fixtures: [first, { ...first, id: 50, ...(patch ? { patch } : {}) }] }, { original })
    .summary;
}
const lamp = fx(u(1), 1, { addresses: A('3.1') });

describe('the size of a kept address by break number (N2)', () => {
  it('gives no known size when two readings of the break number fit', async () => {
    const original = passFile(lamp + hoist(A('1.1', 1)), motor('Offset="30" DMXBreak="2"'));
    const { report } = await withAdded(original, at(1, 3));
    expect(flat(report.information)).toMatch(/^1 kept addresses .* count as 1 channel/m);
    expect(flat(report.warnings)).toMatch(/^Fixture 50 at 1\.3 may overlap fixture 2, which the file keeps at 1\.1 /m);
  });

  it('takes the same number when only that reading fits, each break with its own channels', async () => {
    const original = passFile(lamp + hoist(A('1.1', 1) + A('2.1', 2)), motor('Offset="30" DMXBreak="2"'));
    const { report } = await withAdded(original, at(2, 20));
    expect(flat(report.information)).not.toMatch(/count as 1 channel/);
    expect(flat(report.warnings)).toMatch(/^Fixture 50 at 2\.20 (overlaps|may overlap) the channels of fixture 2\b/m);
    expect(flat((await withAdded(original, at(1, 20))).report.warnings)).toBe('');
  });

  it('takes the number plus one for a file that counts breaks from 0', async () => {
    const original = passFile(lamp + hoist(A('1.1', 0) + A('2.1', 1)), motor('Offset="30" DMXBreak="2"'));
    const { report } = await withAdded(original, at(2, 20));
    expect(flat(report.warnings)).toMatch(/^Fixture 50 at 2\.20 (overlaps|may overlap) the channels of fixture 2\b/m);
  });
});

describe('messages about kept addresses (N3, N6)', () => {
  it('names no neighbour the file already had after a kept address of unknown size', async () => {
    const other = fx(u(2), 2, { at: '{1,0,0}{0,1,0}{0,0,1}{1000,0,6000}', addresses: A('1.400') });
    const original = passFile(fx(u(1), 1, { addresses: A('1.1') + A('1.300', 1) }) + other);
    const design = await load(original);
    const unchanged = exportMvr(design, { original }).summary;
    expect(unchanged.report.warnings).toEqual([]);
    expect(flat(unchanged.report.information)).toMatch(/^1 kept addresses .* count as 1 channel/m);
    const fixtures = design.fixtures.map((fixture) => (fixture.id === 2 ? { ...fixture, patch: at(1, 350) } : fixture));
    const moved = exportMvr({ ...design, fixtures }, { original }).summary;
    expect(flat(moved.report.warnings)).toMatch(
      /^Fixture 2 at 1\.350 may overlap fixture 1, which the file keeps at 1\.300 /m,
    );
  });

  it('names a kept fixture without a number by its name, never as fixture 0', async () => {
    const unnumbered = hoist(A('1.1')).replace(
      '<FixtureID>2</FixtureID><FixtureIDNumeric>2</FixtureIDNumeric>',
      '<FixtureID></FixtureID>',
    );
    const { report } = await withAdded(passFile(lamp + unnumbered, motor('Offset="30"')), at(1, 5));
    expect(flat(report.warnings)).toMatch(/^Fixture 50 at 1\.5 (overlaps|may overlap) the channels of fixture "F2"/m);
    expect(flat(report.warnings)).not.toMatch(/fixture 0\b/);
  });
});
