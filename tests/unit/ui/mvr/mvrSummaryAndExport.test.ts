// @vitest-environment jsdom
/**
 * Owns the import summary view model (counts with their `data-count` keys, offset, geometry line, warnings) and the
 * export flow (`<show name>.mvr`, unsafe characters replaced, bytes that import again).
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { importMvr, type MvrImport } from '../../../../src/mvr';
import { exportMvrFile } from '../../../../src/ui/panels/mvr/exportMvrFile';
import { importSummaryView } from '../../../../src/ui/panels/mvr/importSummaryView';

const summary = { fixtureCount: 248, unpatchedCount: 3, missingGdtfCount: 30, objectCount: 51 };
const result = (noGeometry: boolean): MvrImport =>
  ({
    summary: { ...summary, placementCount: 1508, layerCount: 4, noGeometry },
    geometry: { offset: [1.234, 0, -2.5] },
    warnings: [{ code: 'missing-gdtf', message: 'GDTF Ghost@Wash not found' }],
  }) as unknown as MvrImport;

describe('importSummaryView', () => {
  it('lists the four counts under their e2e keys, the offset, the geometry line and the warnings', () => {
    const view = importSummaryView(result(false));
    expect(view.counts.map(({ key, value }) => [key, value])).toEqual([
      ['fixtures', 248],
      ['unpatched', 3],
      ['missingGdtf', 30],
      ['objects', 51],
    ]);
    expect(view.offset).toBe('Offset x 1.23 m, y 0.00 m, z -2.50 m');
    expect(view.geometry).toBe('Stage built from MVR');
    expect(view.warnings).toEqual(['GDTF Ghost@Wash not found']);
  });

  it('says so when the file has no stage geometry', () => {
    expect(importSummaryView(result(true)).geometry).toBe('No stage geometry in file');
  });
});

describe('exportMvrFile', () => {
  const theatre = createTemplate('theatre');

  it('names the file after the show, keeps Hebrew and replaces unsafe characters', async () => {
    expect((await exportMvrFile(theatre, 'הופעה')).fileName).toBe('הופעה.mvr');
    expect((await exportMvrFile(theatre, ' a/b:c ')).fileName).toBe('a_b_c.mvr');
    expect((await exportMvrFile(theatre, '  ')).fileName).toBe('luma-desk.mvr');
  });

  it('gives bytes that import again with the same fixture count', async () => {
    const file = await exportMvrFile(theatre, 'Show');
    const back = await importMvr(file.bytes, { name: file.fileName });
    expect(back.design.fixtures).toHaveLength(theatre.fixtures.length);
  });
});
