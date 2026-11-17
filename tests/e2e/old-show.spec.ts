import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bootApp, collectErrors, deskState, type SavedShow } from '../shared';

// Saved byte for byte by the pre-refactor app without ?test: the demo show, then "Fixture 201 Thru 230 At Full"
// and "Store Cue 5 Fade 3 Exec 2" (cue 5 added to exec 2 "Blinders").
const FILE = join(import.meta.dirname, '..', 'fixtures', 'old-show-v1.json');
const OLD = JSON.parse(readFileSync(FILE, 'utf8')) as SavedShow;

test('a show saved by the old app loads', async ({ page }) => {
  const errors = collectErrors(page);
  await bootApp(page, { show: OLD });
  const s = await deskState(page);
  expect(s.execs.map((e) => [e.name, e.cues])).toEqual(
    OLD.execs.map((x) => [x.name, x.cues.map((c) => [c.num, c.name, c.fade])]),
  );
  // boot goes to cue 1 of exec 1
  expect([s.execs[0]?.on, s.execs[0]?.cur]).toEqual([true, 0]);
  expect(s.execs[1]?.cues).toContainEqual([5, 'Cue 5', 3]);

  const now = await page.evaluate(() => window.__desk.test.serialize());
  expect(now.execs.map((e) => e.cues)).toEqual(OLD.execs.map((e) => e.cues));
  expect(now.groups).toEqual(OLD.groups);
  expect(now.presets).toEqual(OLD.presets);
  expect([now.v, now.bpm, now.haze]).toEqual([OLD.v, OLD.bpm, OLD.haze]);
  expect(errors).toEqual([]);
});
