// @vitest-environment jsdom
/**
 * Owns the Export MVR flow: the archive holds a mesh file for every geometry file the scene names (contract §8), the
 * summary counts them, and the bytes import again. File-name cleaning is owned by mvrFileName.test.ts.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { importMvr } from '../../../../src/mvr';
import { exportMeshes } from '../../../../src/render/mvr/export/exportMeshes';
import { exportMvrFile } from '../../../../src/ui/panels/mvr/exportMvrFile';

const theatre = createTemplate('theatre');

/** Every `fileName` the scene names: the Geometry3D files of objects and of symbol definitions. */
function namedFiles(scene: string): string[] {
  return [...new Set([...scene.matchAll(/fileName="([^"]+)"/g)].map((match) => match[1] ?? ''))];
}

describe('exportMvrFile', () => {
  it('writes a .glb for every geometry file the scene names and counts them in the summary', async () => {
    const file = await exportMvrFile(theatre, 'Show', { exportMeshes });
    const entries = unzipSync(file.bytes);
    const named = namedFiles(strFromU8(entries['GeneralSceneDescription.xml'] ?? new Uint8Array()));
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((name) => !(name in entries) || !name.endsWith('.glb'))).toEqual([]);
    expect(file.summary.notes).toContain(`Geometry files included: ${named.length}.`);
  });

  it('names the file after the show and gives bytes that import again with the same fixture count', async () => {
    const file = await exportMvrFile(theatre, 'Show', { exportMeshes });
    const back = await importMvr(file.bytes, { name: file.fileName });
    expect([file.fileName, back.design.fixtures.length]).toEqual(['Show.mvr', theatre.fixtures.length]);
  });
});
