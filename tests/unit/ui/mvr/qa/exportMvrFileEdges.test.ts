// @vitest-environment jsdom
/**
 * QA of the Export MVR flow over every template and when render fails. The bugs it guards: an archive that names a
 * mesh file it does not hold, so a console or the desk reports a missing body (D2), and a failed mesh export that
 * still downloads a file without bodies instead of telling the user.
 */
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createTemplate, TEMPLATE_IDS } from '../../../../../src/domain/stage/templates/index.ts';
import { importMvr } from '../../../../../src/mvr/index.ts';
import { exportMeshes } from '../../../../../src/render/mvr/export/exportMeshes.ts';
import { exportMvrFile } from '../../../../../src/ui/panels/mvr/exportMvrFile.ts';

/** Every `fileName` the scene XML names: Geometry3D files of objects and of symbol definitions. */
function namedFiles(entries: Record<string, Uint8Array>): string[] {
  const scene = strFromU8(entries['GeneralSceneDescription.xml'] ?? new Uint8Array());
  return [...new Set([...scene.matchAll(/fileName="([^"]+)"/g)].map((match) => match[1] ?? ''))];
}

describe('exportMvrFile over every template', () => {
  it.each(TEMPLATE_IDS)(
    'the %s archive holds every mesh file it names and imports with no mesh warning',
    async (id) => {
      const file = await exportMvrFile(createTemplate(id), id, { exportMeshes });
      const entries = unzipSync(file.bytes);
      const named = namedFiles(entries);
      const back = await importMvr(file.bytes, { name: file.fileName });
      const meshWarnings = back.warnings.filter((warning) => warning.code.endsWith('-mesh'));
      expect([named.filter((name) => !(name in entries)), meshWarnings]).toEqual([[], []]);
      expect([...file.summary.geometryFiles].sort()).toEqual([...named].sort());
    },
  );
});

describe('exportMvrFile with a failed or empty mesh export', () => {
  it('rejects with the render error and gives no file', async () => {
    const failing = { exportMeshes: (): Promise<never> => Promise.reject(new Error('WebGL context lost')) };
    await expect(exportMvrFile(createTemplate('theatre'), 'Show', failing)).rejects.toThrow('WebGL context lost');
  });

  it('says in the summary that no mesh file is included when render gives none (exportMvr contract)', async () => {
    const file = await exportMvrFile(createTemplate('theatre'), 'Show', {
      exportMeshes: () => Promise.resolve(new Map()),
    });
    expect([Object.keys(unzipSync(file.bytes)), file.summary.geometryFiles]).toEqual([
      ['GeneralSceneDescription.xml'],
      [],
    ]);
    expect(file.summary.notes).toContain('Geometry files included: 0.');
  });
});
