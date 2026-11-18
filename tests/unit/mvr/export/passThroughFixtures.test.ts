// @vitest-environment jsdom
/** Review fixes C1, H1, H3, M1: the export pairs, removes and unpatches exactly the fixtures the desk changed. */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { walkScene } from '../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { fx, gdtfMode, makeGdtf, passFile, passUuid as u, withoutDevices } from '../../../shared/index.ts';

const sceneOf = (bytes: Uint8Array): Document =>
  parseXml(strFromU8(unzipSync(bytes)['GeneralSceneDescription.xml'] ?? new Uint8Array()));
const names = (bytes: Uint8Array): (string | null)[] =>
  Array.from(sceneOf(bytes).getElementsByTagName('Fixture'), (el) => el.getAttribute('name'));
const addresses = (bytes: Uint8Array): (string | null)[] =>
  Array.from(sceneOf(bytes).getElementsByTagName('Address'), (el) => el.textContent);
const load = async (original: Uint8Array): Promise<StageDesign> =>
  (await importMvr(original, { name: 'a.mvr' })).design;

describe('pass-through fixture pairing', () => {
  it('keeps a fixture that is no light, on the desk as a device or not on it (C1)', async () => {
    const motor = makeGdtf({ name: 'Motor', modes: gdtfMode('M', [['Control1', 'Offset="1"']]) });
    const motorFx = fx(u(2), 2, { addresses: '<Address break="0">50</Address>', gdtf: 'Acme@Motor.gdtf', mode: 'M' });
    const original = passFile(fx(u(1), 1, { addresses: '<Address>1</Address>' }) + motorFx, {
      'Acme@Motor.gdtf': motor,
    });
    // the import now keeps the motor as a `device`; a show saved before that has no desk fixture for it
    const imported = await load(original);
    expect(imported.fixtures.map((f) => f.type === 'device')).toEqual([false, true]);
    const design = withoutDevices(imported);
    expect(design.fixtures).toHaveLength(1);
    for (const each of [imported, design]) {
      const { bytes, summary } = exportMvr(each, { original });
      expect(names(bytes)).toEqual(['F1', 'F2']);
      expect(addresses(bytes)).toEqual(['1', '50']);
      expect(summary.changes?.removed).toBe(0);
    }
  });

  const twins = passFile(
    fx(u(1), 1, { addresses: '<Address>1</Address>' }) + fx(u(1), 2, { addresses: '<Address>101</Address>' }),
  );

  it('writes a patch change on the second of two fixtures with one uuid (H1)', async () => {
    const design = await load(twins);
    const second = design.fixtures[1];
    const fixtures = design.fixtures.map((f) =>
      f === second ? { ...f, patch: { universe: 3, address: 10, mode: 'Mode 1' } } : f,
    );
    expect(addresses(exportMvr({ ...design, fixtures }, { original: twins }).bytes)).toEqual(['1', '1034']);
  });

  it('removes the right one of two fixtures with one uuid (H1)', async () => {
    const design = await load(twins);
    const { bytes } = exportMvr({ ...design, fixtures: design.fixtures.slice(1) }, { original: twins });
    expect([names(bytes), addresses(bytes)]).toEqual([['F2'], ['101']]);
  });

  it('keeps a child fixture in place when the desk deletes its parent fixture (H3)', async () => {
    const child = fx(u(5), 5, { at: '{1,0,0}{0,1,0}{0,0,1}{0,0,-500}', addresses: '<Address>200</Address>' });
    const original = passFile(fx(u(1), 1, { addresses: '<Address>1</Address>', children: child }));
    const design = await load(original);
    const kept = design.fixtures.filter((f) => design.mvr?.fixtures[String(f.id)]?.uuid !== u(1));
    const { bytes } = exportMvr({ ...design, fixtures: kept }, { original });
    const world = walkScene(sceneOf(bytes)).fixtures.map((f) => [f.uuid, ...f.matrix.slice(12, 15)]);
    expect(world).toEqual([[u(5), 0, 0, 5500]]);
  });

  it('removes the modelled address of a fixture unpatched on the desk and keeps other breaks (M1)', async () => {
    const original = passFile(
      fx(u(1), 1, { addresses: '<Address break="0">1</Address><Address break="1">300</Address>' }),
    );
    const design = await load(original);
    const fixtures = design.fixtures.map(({ patch: _patch, ...rest }) => rest);
    const { bytes, summary } = exportMvr({ ...design, fixtures }, { original });
    expect([addresses(bytes), summary.changes?.unpatched]).toEqual([['300'], 1]);
  });
});
