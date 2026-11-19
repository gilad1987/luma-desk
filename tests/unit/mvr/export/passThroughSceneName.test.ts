// @vitest-environment jsdom
/**
 * The scene file the pass-through export patches is the one the import read: the exact name
 * `GeneralSceneDescription.xml` first, then a name in another case, as the import's `NameIndex` orders its rules.
 */
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { readOriginal } from '../../../../src/mvr/export/passThrough/readOriginal.ts';

const SCENE = (tag: string): Uint8Array => strToU8(`<GeneralSceneDescription><${tag}/></GeneralSceneDescription>`);

describe('readOriginal scene name', () => {
  it('takes the exact name over an earlier entry in another case', () => {
    const bytes = zipSync({
      'generalscenedescription.xml': SCENE('Lower'),
      'GeneralSceneDescription.xml': SCENE('Exact'),
    });
    const original = readOriginal(bytes);
    expect(original.sceneName).toBe('GeneralSceneDescription.xml');
    expect(original.sceneText).toContain('<Exact/>');
  });

  it('takes a name in another case when no entry has the exact name', () => {
    const original = readOriginal(zipSync({ 'a.txt': strToU8('a'), 'GENERALSCENEDESCRIPTION.XML': SCENE('Upper') }));
    expect([original.sceneName, original.sceneText.includes('<Upper/>')]).toEqual([
      'GENERALSCENEDESCRIPTION.XML',
      true,
    ]);
  });
});
