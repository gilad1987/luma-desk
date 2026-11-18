// @vitest-environment jsdom
/** Audit B6 and C1: who a pass-through export says wrote the file, and which MVR version it declares. */
import { strFromU8, strToU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { readLumaData } from '../../../../src/mvr/import/readLumaData.ts';
import { exportMvr, importMvr, type MvrExport } from '../../../../src/mvr/index.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, makeMvr, passScene, passThroughMvr, passUuid as u, SIZED_TYPE } from '../../../shared/index.ts';

const sceneOf = (bytes: Uint8Array): Document =>
  parseXml(strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array()));
const rootOf = (bytes: Uint8Array): (string | null)[] =>
  ['verMajor', 'verMinor', 'provider', 'providerVersion'].map((name) =>
    sceneOf(bytes).documentElement.getAttribute(name),
  );
const load = async (original: Uint8Array): Promise<StageDesign> =>
  (await importMvr(original, { name: 'a.mvr' })).design;
/** A file of another program that declares MVR 1.`minor`. */
const fileOf = (minor: number): Uint8Array => {
  const scene = passScene(fx(u(1), 1, { addresses: '<Address break="0">1</Address>' }));
  const root = `verMajor="1" verMinor="${minor}" provider="Other" providerVersion="2"`;
  return makeMvr(scene.replace('verMajor="1" verMinor="6"', root), { 'Test@Spot.gdtf': strToU8('not a real gdtf') });
};
/** The export of `original` with one fixture added on the desk. */
async function withAdded(original: Uint8Array): Promise<MvrExport> {
  const design = await load(original);
  const first = design.fixtures[0];
  if (!first) throw new Error('no fixture');
  const bare = (({ patch: _patch, ...rest }: StageDesign['fixtures'][number]) => rest)(first);
  return exportMvr({ ...design, fixtures: [first, { ...bare, id: 50, type: SIZED_TYPE }] }, { original });
}
const versionLines = ({ summary }: MvrExport): string[] =>
  summary.report.warnings.map((item) => item.text).filter((text) => text.includes('declared MVR'));

describe('the root of a pass-through export (B6, C1)', () => {
  it('names the desk as provider and keeps the first provider in the desk data', async () => {
    const original = passThroughMvr();
    const { bytes } = exportMvr(await load(original), { original });
    expect(rootOf(original)).toEqual(['1', '6', 'Other', '2']);
    expect(rootOf(bytes)).toEqual(['1', '6', 'LUMA DESK', '1']);
    expect(readLumaData(sceneOf(bytes))?.originalProvider).toEqual({ provider: 'Other', providerVersion: '2' });
    expect(sceneOf(bytes).querySelector('Data[provider="Other"] Note')?.textContent).toBe('keep me');
  });

  it('carries the first provider through a second export from the desk export', async () => {
    const original = passThroughMvr();
    const first = exportMvr(await load(original), { original }).bytes;
    const second = exportMvr(await load(first), { original: first }).bytes;
    expect(rootOf(second)).toEqual(['1', '6', 'LUMA DESK', '1']);
    expect(readLumaData(sceneOf(second))?.originalProvider).toEqual({ provider: 'Other', providerVersion: '2' });
  });

  it('reads desk data without the field as before, and drops a malformed one alone', async () => {
    const plain = exportMvr(await load(fileOf(6))).bytes;
    const data = readLumaData(sceneOf(plain));
    expect(data && 'originalProvider' in data).toBe(false);
    const text = strFromU8(unzipSync(plain)['GeneralSceneDescription.xml'] ?? new Uint8Array());
    const bad = parseXml(text.replace('{&quot;venue&quot;', '{&quot;originalProvider&quot;:7,&quot;venue&quot;'));
    expect(text).toContain('{&quot;venue&quot;');
    expect(readLumaData(bad)).toEqual(data);
  });

  it('keeps a lower declared version when the desk added nothing', async () => {
    const original = fileOf(4);
    const result = exportMvr(await load(original), { original });
    expect(rootOf(result.bytes).slice(0, 2)).toEqual(['1', '4']);
    expect(versionLines(result)).toEqual([]);
  });

  it('declares 1.6 and says so when the desk added a fixture to a file of a lower version', async () => {
    const result = await withAdded(fileOf(4));
    expect(rootOf(result.bytes).slice(0, 2)).toEqual(['1', '6']);
    expect(versionLines(result)).toEqual([
      'The file declared MVR 1.4; the fixtures added on the desk are written as MVR 1.6 fixtures ' +
        '(FixtureIDNumeric), so this export declares MVR 1.6.',
    ]);
    expect(versionLines(await withAdded(fileOf(6)))).toEqual([]);
  });
});
