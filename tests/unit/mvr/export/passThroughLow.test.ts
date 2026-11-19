// @vitest-environment jsdom
/** Second review, low findings: an unreadable child matrix, the scene entry's ZIP method, the fallback's real error. */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { walkScene } from '../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, passFile, passScene, passUuid as u, ROT90Z } from '../../../shared/index.ts';

const SCENE = 'GeneralSceneDescription.xml';
const sceneOf = (bytes: Uint8Array): Document => parseXml(strFromU8(unzipSync(bytes)[SCENE] ?? new Uint8Array()));
const load = async (original: Uint8Array): Promise<StageDesign> =>
  (await importMvr(original, { name: 'a.mvr' })).design;
const patched = (n: number): string => `<Address>${n}</Address>`;

describe('pass-through low findings', () => {
  it('keeps the world position of a child with an unreadable Matrix under a deleted fixture (L-a)', async () => {
    const child = fx(u(5), 5, { at: 'not a matrix', addresses: patched(200) });
    const original = passFile(fx(u(1), 1, { at: `${ROT90Z}{1000,2000,6000}`, addresses: patched(1), children: child }));
    const design = await load(original);
    const fixtures = design.fixtures.filter((fixture) => fixture.id !== 1);
    const { bytes, summary } = exportMvr({ ...design, fixtures }, { original });
    const world = (archive: Uint8Array): number[] => {
      const record = walkScene(sceneOf(archive)).fixtures.find((item) => item.uuid === u(5));
      return Array.from(record?.matrix.slice(12, 15) ?? [], (value) => Math.round(value));
    };
    expect(summary.changes?.removed).toBe(1);
    expect(world(original)).toEqual([1000, 2000, 6000]);
    expect(world(bytes)).toEqual([1000, 2000, 6000]);
  });

  it('keeps the STORE method of the scene entry (L-b)', async () => {
    const original = zipSync({
      [SCENE]: [strToU8(passScene(fx(u(1), 1, { addresses: patched(1) }))), { level: 0 }],
      'Test@Spot.gdtf': [strToU8('g'.repeat(500)), { level: 6 }],
    });
    const methods = (archive: Uint8Array): string[] => {
      const found: string[] = [];
      unzipSync(archive, { filter: (file) => found.push(`${file.name}:${file.compression}`) < 0 });
      return found;
    };
    const { bytes } = exportMvr(await load(original), { original });
    expect(methods(original)).toEqual([`${SCENE}:0`, 'Test@Spot.gdtf:8']);
    expect(methods(bytes)).toEqual(methods(original));
  });

  it('logs the real error once and names it in the note when the original cannot be used (L-f)', async () => {
    const design = await load(passFile(fx(u(1), 1, { addresses: patched(1) })));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { summary } = exportMvr(design, { original: new Uint8Array([1, 2, 3]) });
    const calls = warn.mock.calls.length;
    warn.mockRestore();
    expect(calls).toBe(1);
    expect(summary.report.losses.map((item) => item.text).join('\n')).toMatch(
      /\(.+\); its scenery, mesh and GDTF files are not in this export\.$/m,
    );
  });
});
