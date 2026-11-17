// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { exportMvr } from '../../../../src/mvr/export/exportMvr.ts';
import { importMvr } from '../../../../src/mvr/index.ts';
import { expectRigKept, importCounts, readSample, SAMPLES_DIR, sampleFiles } from '../../../shared/index.ts';

/**
 * Acceptance (3) of the MVR export, local only: every real file in `MVR_SAMPLES_DIR` (the official samples and the
 * user's private show, never committed) imported, exported and imported again keeps its fixture count, ids, patches
 * and positions within 1 mm. A second generation (that import exported and imported once more) must keep them too,
 * and keep every fixture's GDTF name and mode, as the first re-import restores the desk types from the luma data.
 */
const FILES = sampleFiles();

/** Each fixture's stored GDTF name and mode by desk id: what a console reads to patch it. */
const gdtfFacts = (design: StageDesign): unknown =>
  Object.entries(design.mvr?.fixtures ?? {}).map(([id, info]) => [id, info.gdtfName, info.gdtfMode]);

describe.skipIf(SAMPLES_DIR === undefined)('local MVR round trip', () => {
  // Without it an empty folder would end in "No test found in suite" instead of naming the real problem.
  it('finds .mvr files in MVR_SAMPLES_DIR', () => {
    expect(FILES, `no .mvr file in ${SAMPLES_DIR ?? ''}`).not.toEqual([]);
  });

  it.each(FILES)(
    'keeps the rig of %s',
    async (file) => {
      const first = await importMvr(readSample(file), { name: file });
      const exported = exportMvr(first.design);
      const second = await importMvr(exported.bytes, { name: file });
      console.info(file, 'export', exported.summary, 'bytes:', exported.bytes.length);
      console.info(file, 'second import', importCounts(second));
      expect(second.summary.fixtureCount).toBe(first.summary.fixtureCount);
      expectRigKept(first.design, second.design);
      const third = await importMvr(exportMvr(second.design).bytes, { name: file });
      expectRigKept(second.design, third.design);
      expect(gdtfFacts(third.design)).toEqual(gdtfFacts(first.design));
    },
    120_000,
  );
});
