// @vitest-environment jsdom
/** `MvrImport.meshes`: the bytes render parses, one entry per placement file the archive holds. */
import { describe, expect, it } from 'vitest';
import { importMvr } from '../../../src/mvr/index.ts';
import { make3ds, meshScene } from '../../shared/index.ts';

describe('importMvr meshes', () => {
  it('holds the bytes of every placed file the archive has, once, and skips missing ones', async () => {
    const box = make3ds([
      [0, 0, 0],
      [100, 100, 100],
    ]);
    const placements = [{ file: 'box.3ds' }, { file: 'box.3ds' }, { file: 'gone.glb' }];
    const result = await importMvr(meshScene(placements, { 'box.3ds': box, 'unused.3ds': box }), { name: 'bytes' });
    expect([...result.meshes.keys()]).toEqual(['box.3ds']);
    expect(result.meshes.get('box.3ds')).toEqual(box);
  });
});
