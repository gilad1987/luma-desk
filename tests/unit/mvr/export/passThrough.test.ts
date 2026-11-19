// @vitest-environment jsdom
/**
 * Export of an imported design from its original file: the scene tree and every archive entry survive, and only what
 * the desk owns (patch, ids, type, pose, added and deleted fixtures, the desk's own data) changes.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr, importMvr } from '../../../../src/mvr/index.ts';
import { walkScene } from '../../../../src/mvr/scene/walkScene.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';
import { PASS, passThroughMvr, treeOf } from '../../../shared/index.ts';

const SCENE = 'GeneralSceneDescription.xml';
const sceneOf = (bytes: Uint8Array): Document => parseXml(strFromU8(unzipSync(bytes)[SCENE] ?? new Uint8Array()));
const uuidOf = (design: StageDesign, id: number): string | undefined => design.mvr?.fixtures[String(id)]?.uuid;

async function imported(): Promise<{ original: Uint8Array; design: StageDesign }> {
  const original = passThroughMvr();
  return { original, design: (await importMvr(original, { name: 'pass.mvr' })).design };
}

describe('pass-through export', () => {
  it('keeps the scene tree and every other entry byte for byte when the desk changed nothing', async () => {
    const { original, design } = await imported();
    const { bytes, summary } = exportMvr(design, { original });
    const [before, after] = [unzipSync(original), unzipSync(bytes)];
    expect(Object.keys(after)).toEqual(Object.keys(before));
    for (const name of Object.keys(before).filter((n) => n !== SCENE)) expect(after[name]).toEqual(before[name]);
    // The root names the exporting application (audit B6): its two provider attributes are the only difference.
    const [was, now] = ['provider=Other providerVersion=2', 'provider=LUMA DESK providerVersion=1'];
    const tree = treeOf(sceneOf(original).documentElement);
    expect(tree).toContain(was);
    expect(treeOf(sceneOf(bytes).documentElement)).toBe(tree.replace(was, now));
    expect(strFromU8(after[SCENE] ?? new Uint8Array())).toMatch(
      /^<\?xml version="1.0" encoding="UTF-8" standalone="yes"\?>/,
    );
    expect(summary.changes).toEqual({ updated: 0, moved: 0, added: 0, removed: 0, unpatched: 0, spares: 0 });
    expect(summary.kept).toMatchObject({ objects: 3, groups: 3, symbols: 1, layers: 1, classes: 2, gdtfFiles: 1 });
  });

  it('writes a changed patch, removes a deleted fixture and keeps the rest', async () => {
    const { original, design } = await imported();
    const wash = design.fixtures.find((f) => uuidOf(design, f.id) === PASS.wash);
    const fixtures = design.fixtures
      .filter((f) => uuidOf(design, f.id) !== PASS.deep)
      .map((f) => (f === wash ? { ...f, patch: { universe: 3, address: 10, mode: 'Mode 1' } } : f));
    const { bytes, summary } = exportMvr({ ...design, fixtures }, { original });
    const doc = sceneOf(bytes);
    const addresses = Array.from(doc.getElementsByTagName('Address'), (a) => a.textContent);
    expect(addresses).toEqual(['1.1', '2.1', '1034']);
    expect(doc.getElementsByTagName('GroupObject')).toHaveLength(3);
    expect(doc.getElementsByTagName('SceneObject')).toHaveLength(2);
    expect(summary.changes).toEqual({ updated: 1, moved: 0, added: 0, removed: 1, unpatched: 0, spares: 0 });
    const again = await importMvr(bytes, { name: 'again.mvr' });
    expect(again.design.fixtures.map((f) => f.patch?.universe)).toEqual([1, 3]);
  });

  it('writes a moved fixture inside a moved group back into the group frame', async () => {
    const { original, design } = await imported();
    const fixtures = design.fixtures.map((f) =>
      uuidOf(design, f.id) === PASS.deep
        ? { ...f, position: [f.position[0] + 1, f.position[1], f.position[2]] as const }
        : f,
    );
    const { bytes, summary } = exportMvr({ ...design, fixtures }, { original });
    const deep = walkScene(sceneOf(bytes)).fixtures.find((f) => f.uuid === PASS.deep);
    expect([...(deep?.matrix.slice(12, 15) ?? [])].map(Math.round)).toEqual([1000, 4000, 6000]);
    expect(summary.changes?.moved).toBe(1);
  });

  it('appends a fixture added on the desk to its layer', async () => {
    const { original, design } = await imported();
    const spot = design.fixtures[0];
    if (!spot) throw new Error('no fixture');
    const { bytes, summary } = exportMvr(
      { ...design, fixtures: [...design.fixtures, { ...spot, id: 99 }] },
      { original },
    );
    expect(sceneOf(bytes).getElementsByTagName('Fixture')).toHaveLength(4);
    expect(summary.changes?.added).toBe(1);
  });

  it('lists the scenery loss when the original file is not stored', async () => {
    const { design } = await imported();
    const { summary } = exportMvr(design);
    expect(summary.notes.some((note) => note.startsWith('The scenery of the imported file'))).toBe(true);
  });
});
