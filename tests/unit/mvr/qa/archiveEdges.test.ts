// @vitest-environment jsdom
/**
 * QA of the archive edge of `importMvr`: archives that hold too little, archives cut short, and repeat imports. The
 * parser branches behind each case are owned by `MvrArchive.test.ts` and `parseXml.test.ts`; this file only checks
 * that the public entry turns them into an `MvrError` or a usable result, never a raw error.
 */
import { describe, expect, it } from 'vitest';
import { importMvr, MvrError } from '../../../../src/mvr/index.ts';
import { makeMvr, makeZip, sceneXml } from '../../../shared/index.ts';

const FIXTURE = '<Fixture uuid="F1" name="F1"><GDTFSpec>Ghost@Wash</GDTFSpec><GDTFMode/></Fixture>';
const SCENE_ONLY = makeMvr(sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${FIXTURE}</ChildList></Layer>`));

describe('importMvr archive edges', () => {
  it('rejects an empty ZIP with no-scene', async () => {
    const failure = importMvr(makeZip({}), { name: 'empty' });
    await expect(failure).rejects.toBeInstanceOf(MvrError);
    await expect(failure).rejects.toMatchObject({ code: 'no-scene' });
  });

  it.each([0.25, 0.5, 0.9])('rejects an MVR cut to %d of its length with not-zip', async (part) => {
    const failure = importMvr(SCENE_ONLY.slice(0, Math.floor(SCENE_ONLY.length * part)), { name: 'cut' });
    await expect(failure).rejects.toMatchObject({ name: 'MvrError', code: 'not-zip' });
  });

  it('rejects zero bytes with not-zip', async () => {
    await expect(importMvr(new Uint8Array(0), { name: 'none' })).rejects.toMatchObject({ code: 'not-zip' });
  });

  it('imports a ZIP that holds only the scene file, with one missing-gdtf warning and no geometry', async () => {
    const { summary, warnings, design } = await importMvr(SCENE_ONLY, { name: 'scene only' });
    expect([summary.fixtureCount, summary.missingGdtfCount, summary.noGeometry]).toEqual([1, 1, true]);
    expect(warnings.map((w) => w.code)).toEqual(['missing-gdtf', 'no-geometry']);
    expect(design.source).toEqual({ kind: 'mvr', name: 'scene only' });
  });

  it('gives the same result for the same bytes twice and leaves the bytes unchanged', async () => {
    const copy = SCENE_ONLY.slice();
    const first = await importMvr(SCENE_ONLY, { name: 'x', fileHash: 'h' });
    const second = await importMvr(SCENE_ONLY, { name: 'x', fileHash: 'h' });
    expect(second).toStrictEqual(first);
    expect(SCENE_ONLY).toStrictEqual(copy);
  });
});
