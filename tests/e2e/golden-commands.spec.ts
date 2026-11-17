import { test } from '@playwright/test';
import { bootApp, expectGolden } from '../shared';

// Each line runs in order on the demo show; the golden holds its log lines and the state after it.
// It covers every keyword, the aliases, selection modes and the error paths.
const TRANSCRIPT = [
  'Fixture 201 Thru 230 At Full',
  'Group 3 At 50',
  'Group 2 + Group 5',
  'Fixture 101 Thru 110 - 105',
  'At 75',
  'Fixture 201 @ 40',
  'Preset 4.3',
  'Preset 2.2',
  'Clear',
  'ClearAll',
  'Group 99',
  'Bogus 1',
  'Fixture',
  'At',
  'Fixture 210 Thru 201 At Zero',
  'Fixture 201 Thru 210 At Full',
  'Store Cue 5 Fade 3 Exec 2',
  'Exec 2',
  'Go',
  'Goto Cue 5',
  'Goto Cue 77',
  'Label Cue 5 Big Look',
  'Fade 1.5',
  'Pause',
  'Off',
  'Go+ Exec 1',
  'Go+ Exec 1',
  'Go- Exec 1',
  'Off Exec 1',
  'Highlight',
  'Highlight',
  'Blackout',
  'Blackout',
  'Group 4 At 60',
  'Store Group 40',
  'Label Group 40 Test Group',
  'Store Preset 4.20',
  'Exec 2',
  'Delete Cue 5',
  'Delete Cue 5',
  'Label Exec 3 Third',
  'All',
  'Exec 1',
  'Store Cue 10',
  'ClearAll',
];

test('command transcript matches the golden', async ({ page }) => {
  await bootApp(page);
  const results = await page.evaluate((lines) => lines.map((l) => window.__desk.test.run(l)), TRANSCRIPT);
  expectGolden('command-transcript', results);
});
