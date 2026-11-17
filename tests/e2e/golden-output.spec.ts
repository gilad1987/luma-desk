import { test } from '@playwright/test';
import { bootApp, expectGolden, type FixtureOutput } from '../shared';

interface OutputSnapshot {
  label: string;
  t: number;
  out: FixtureOutput[];
}

// computeOutput() of all fixtures at fixed times (seconds of the test clock, which starts at 10):
// fades at 25 % / 75 % / done, phasers, a zero-time cue, programmer over playback, highlight and blackout.
test('computeOutput at fixed times matches the golden', async ({ page }) => {
  await bootApp(page);
  const snaps = await page.evaluate(() => {
    const desk = window.__desk.test;
    const out: OutputSnapshot[] = [];
    const at = (label: string, t: number) => out.push({ label, t, out: desk.outputAt(t) });
    at('boot', 10);
    desk.run('Go+ Exec 1');
    at('go+ fade 25%', 11);
    at('go+ fade 75%', 13);
    at('go+ done', 20);
    desk.run('Goto Cue 6');
    at('cue 6 fx 0.25s', 20.25);
    at('cue 6 fx 1.7s', 21.7);
    desk.run('Goto Cue 8');
    at('cue 8 drop', 23.1);
    desk.run('Fixture 201 Thru 215 At 50');
    desk.run('Highlight');
    at('programmer + highlight', 24);
    desk.run('Highlight');
    desk.run('Blackout');
    at('blackout', 25);
    return out;
  });
  expectGolden('compute-output', snaps);
});
