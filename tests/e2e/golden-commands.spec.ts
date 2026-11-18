import { test } from '@playwright/test';
import { bootApp, expectGolden } from '../shared/e2e';
import { ALIAS_LINES } from './transcripts/aliasLines';
import { BASE_LINES } from './transcripts/baseLines';
import { PARTIAL_ERROR_LINES } from './transcripts/partialErrorLines';
import { STORE_LINES } from './transcripts/storeLines';

// Each transcript runs in order on a freshly booted demo show; its golden holds, for every line, the log lines, the
// toast and the state after it. Each transcript file says what it covers.
const TRANSCRIPTS = {
  'command-transcript': BASE_LINES,
  'command-aliases': ALIAS_LINES,
  'command-partial-errors': PARTIAL_ERROR_LINES,
  'command-store': STORE_LINES,
};

for (const [golden, lines] of Object.entries(TRANSCRIPTS)) {
  test(`${golden} matches the golden`, async ({ page }) => {
    const desk = await bootApp(page);
    const results = await desk.evaluate((d, lines) => lines.map((l) => d.run(l)), lines);
    expectGolden(golden, results);
  });
}
