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
  const desk = await bootApp(page);
  const snaps = await desk.evaluate((d) => {
    const out: OutputSnapshot[] = [];
    const at = (label: string, t: number) => out.push({ label, t, out: d.outputAt(t) });
    at('boot', 10);
    d.run('Go+ Exec 1');
    at('go+ fade 25%', 11);
    at('go+ fade 75%', 13);
    at('go+ done', 20);
    d.run('Goto Cue 6');
    at('cue 6 fx 0.25s', 20.25);
    at('cue 6 fx 1.7s', 21.7);
    d.run('Goto Cue 8');
    at('cue 8 drop', 23.1);
    d.run('Fixture 201 Thru 215 At 50');
    d.run('Highlight');
    at('programmer + highlight', 24);
    d.run('Highlight');
    d.run('Blackout');
    at('blackout', 25);
    return out;
  });
  expectGolden('compute-output', snaps);
});

// The phaser types the first test does not reach: exec 4 "Floor Chase" (dimChase) and exec 5 "Swipe T2" (dimSaw),
// a programmer rgbChase started as the phaser buttons start it, and a paused fade, which must hold its output.
test('computeOutput of phasers and a paused fade matches the golden', async ({ page }) => {
  const desk = await bootApp(page);
  const snaps = await desk.evaluate((d) => {
    const out: OutputSnapshot[] = [];
    const at = (label: string, t: number) => out.push({ label, t, out: d.outputAt(t) });
    d.run('Exec 4');
    d.run('Goto Cue 1');
    at('exec 4 dimChase', 12);
    at('exec 4 dimChase +0.3s', 12.3);
    d.run('Off');
    d.run('Exec 5');
    d.run('Goto Cue 1');
    at('exec 5 dimSaw', 14);
    at('exec 5 dimSaw +0.4s', 14.4);
    d.run('Off');
    d.run('Group 2');
    d.applyFx('rgbChase');
    at('programmer rgbChase', 15);
    at('programmer rgbChase +0.5s', 15.5);
    d.run('ClearAll');
    d.run('Exec 1');
    d.run('Go+');
    at('exec 1 fade running', 16);
    d.run('Pause');
    at('exec 1 fade paused', 17);
    at('exec 1 fade paused +3s', 20);
    return out;
  });
  expectGolden('compute-output-phasers', snaps);
});
