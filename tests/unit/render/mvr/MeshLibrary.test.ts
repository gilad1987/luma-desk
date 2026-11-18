// @vitest-environment jsdom
/**
 * MeshLibrary's parse results: a file three.js cannot parse is reported (and `MvrStage.show` passes it on), not
 * silently empty; a 3DS mesh with several
 * material groups keeps a part per group in that group's colour; and a 3DS texture name is never fetched.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MeshPhongMaterial } from 'three';
import { importMvr } from '../../../../src/mvr/index.ts';
import { MeshLibrary } from '../../../../src/render/mvr/MeshLibrary.ts';
import { MvrStage } from '../../../../src/render/mvr/MvrStage.ts';
import { make3dsGroups, meshScene } from '../../../shared/index.ts';

const RED = { name: 'red', rgb: [255, 0, 0] } as const;
const BLUE = { name: 'blue', rgb: [0, 0, 255] } as const;
/** A GLB header that promises 100 bytes and ends after 12. */
const TRUNCATED_GLB = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0, 100, 0, 0, 0]);

const libraryOf = (file: string, bytes: Uint8Array): MeshLibrary =>
  new MeshLibrary(new Map([[file, bytes]]), new Map());

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MeshLibrary', () => {
  it('reports a file the loader cannot parse, with the reason', async () => {
    const library = libraryOf('bad.glb', TRUNCATED_GLB);
    expect(await library.parts('bad.glb')).toEqual([]);
    const failures = library.failures();
    expect(failures.map((failure) => failure.file)).toEqual(['bad.glb']);
    expect(failures[0]?.reason).not.toBe('');
  });

  it('lets MvrStage.show resolve with the files it could not parse', async () => {
    const mvr = meshScene([{ file: 'bad.glb' }], { 'bad.glb': TRUNCATED_GLB });
    const { design, geometry, meshes, meshResources } = await importMvr(mvr, { name: 'bad' });
    const failures = await new MvrStage().show({ design, geometry, meshes, meshResources });
    expect(failures.map((failure) => failure.file)).toEqual(['bad.glb']);
  });

  it('reports no failure for a file the archive does not hold', async () => {
    const library = libraryOf('a.3ds', make3dsGroups([RED]));
    expect(await library.parts('missing.3ds')).toEqual([]);
    expect(library.failures()).toEqual([]);
  });

  it('gives a 3DS mesh with two material groups one part per group, in its own colour', async () => {
    const parts = await libraryOf('two.3ds', make3dsGroups([RED, BLUE])).parts('two.3ds');
    const colours = parts.map((part) => (part.material as MeshPhongMaterial).color.getHexString());
    expect(colours).toEqual(['ff0000', '0000ff']);
    expect(parts.map((part) => [part.geometry.index?.count, part.geometry.getAttribute('position').count])).toEqual([
      [3, 3],
      [3, 3],
    ]);
  });

  it('never asks the app origin for a 3DS texture and draws the part in its colour instead', async () => {
    const sources: string[] = [];
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(function (this: HTMLImageElement, url) {
      sources.push(url);
      descriptor?.set?.call(this, url);
    });
    const textured = { ...RED, texture: 'wood.jpg' };
    const parts = await libraryOf('wood.3ds', make3dsGroups([textured, BLUE])).parts('wood.3ds');
    expect(sources.filter((url) => !/^(blob|data):/.test(url))).toEqual([]);
    expect(parts.map((part) => (part.material as MeshPhongMaterial).map)).toEqual([null, null]);
  });
});
