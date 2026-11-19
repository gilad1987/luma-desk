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

  it('finds a fileName without an extension as the bare entry first, then as the .3ds entry (C3)', async () => {
    const mesh = (size: number): Uint8Array =>
      make3ds([
        [0, 0, 0],
        [size, size, size],
      ]);
    const files = { 'geo1.3ds': mesh(100), 'GEO2.3DS': mesh(200), geo3: mesh(300), 'geo3.3ds': mesh(400) };
    const placements = [{ file: 'geo1' }, { file: 'geo2' }, { file: 'geo3' }, { file: 'geo4' }];
    const result = await importMvr(meshScene(placements, files), { name: 'bare' });
    expect([...result.meshes.keys()]).toEqual(['geo1', 'geo2', 'geo3']);
    expect(result.meshes.get('geo1')).toEqual(files['geo1.3ds']);
    expect(result.meshes.get('geo2')).toEqual(files['GEO2.3DS']);
    expect(result.meshes.get('geo3')).toEqual(files.geo3);
    const missing = result.warnings.filter((warning) => warning.code === 'missing-mesh');
    expect(missing.map((warning) => warning.ref)).toEqual(['geo4']);
  });
});
