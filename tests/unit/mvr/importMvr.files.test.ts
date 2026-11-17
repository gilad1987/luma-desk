// @vitest-environment jsdom
/** What `importMvr` accepts as an MVR file before it reads the scene: the scene file name and the archive itself. */
import { describe, expect, it } from 'vitest';
import { importMvr, MvrError } from '../../../src/mvr/index.ts';
import { makeMvr, makeZip, sceneXml } from '../../shared/index.ts';

describe('importMvr file checks', () => {
  it('finds the scene file in any letter case', async () => {
    const result = await importMvr(makeZip({ 'generalscenedescription.xml': sceneXml('') }), { name: 'x' });
    expect(result.summary).toMatchObject({ fixtureCount: 0, noGeometry: true });
  });

  it.each([
    ['not-zip', new Uint8Array([1, 2, 3])],
    ['no-scene', makeZip({ 'readme.txt': 'hi' })],
    ['bad-xml', makeMvr('<GeneralSceneDescription><Scene>')],
  ])('rejects a file it cannot use with %s', async (code, bytes) => {
    const failure = importMvr(bytes, { name: 'x' });
    await expect(failure).rejects.toBeInstanceOf(MvrError);
    await expect(failure).rejects.toMatchObject({ code });
  });
});
