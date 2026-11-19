import { expect, test } from '@playwright/test';
import {
  SAMPLES_DIR,
  bootApp,
  collectErrors,
  expectPatchesKept,
  exportAndImport,
  mvrFile,
  pickMvrFile,
  readMvrStage,
  readSample,
  sampleFiles,
} from '../shared/e2e';

/*
 * Local only: the official gdtf.eu samples are third-party files and never committed, so this spec reads them from
 * MVR_SAMPLES_DIR. One sample at a time, because the largest files take seconds and a lot of memory to load.
 */
test.describe.configure({ mode: 'default', timeout: 300_000 });

/** A known defect of one sample file: the summary warning the import gives for it. */
interface KnownIssue {
  readonly warning: RegExp;
}

/**
 * Demostage_MVR's glTF mesh names a texture its archive lacks: the import warns once, and the mesh draws without the
 * texture and without a console error. Any console error fails its sample.
 */
const KNOWN_ISSUES: Readonly<Record<string, KnownIssue>> = {
  'Demostage_MVR.mvr': { warning: /needs? "vsBlkSatinTexture\.png", which is not in the MVR file/ },
};

test.beforeEach(() => {
  test.info().skip(SAMPLES_DIR === undefined, 'set MVR_SAMPLES_DIR to run the official MVR samples');
});

test('the MVR samples folder holds .mvr files', () => {
  expect(sampleFiles().length).toBeGreaterThan(0);
});

// The title carries an index, not the file name: the samples can be private files, and a title reaches every log and
// report artifact. For the same reason no assertion below prints the name when it fails.
for (const [index, name] of sampleFiles().entries()) {
  const title = `sample ${index + 1} imports, exports and imports again with the same fixtures and kept patches`;
  test(title, async ({ page }) => {
    const known = KNOWN_ISSUES[name];
    const errors = collectErrors(page);
    const desk = await bootApp(page);
    await pickMvrFile(page, desk, mvrFile(name, readSample(name)));
    if (known) await expect(page.locator('#mvrWarnings')).toContainText(known.warning);
    await page.locator('#mvrSummaryClose').click();
    const imported = await readMvrStage(desk);
    expect(imported.kind).toBe('mvr');
    expect(imported.fileName === name).toBe(true);

    await exportAndImport(page, desk);
    const reimported = await readMvrStage(desk);
    expect(reimported.fixtureCount).toBe(imported.fixtureCount);
    expectPatchesKept(imported.patches, reimported.patches);
    expect(errors).toEqual([]);
  });
}
