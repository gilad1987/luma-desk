/**
 * QA6: the missing-fixture warning in the wired engine, fed by `observeCues`, across GO, `goto`, the fader and the
 * flash, over committed and preview rig changes. One warning per executor and cue per committed rig; a fire that
 * repeats the cue stays quiet. What the notice counts is owned by `../MissingFixtureNotice.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import type { Cue } from '../../../../../src/engine/CueList';
import { rigWorld } from './rigWorld';

/** Cue 1 names 809 and 2001, which the theatre lacks; cue 2 names only 101, which every stage but empty has. */
const cues = (): Cue[] => [
  { num: 1, name: 'A', fade: 0, vals: { 101: { dim: 1 }, 809: { dim: 1 }, 2001: { dim: 1 } }, fx: [] },
  { num: 2, name: 'B', fade: 0, vals: { 101: { dim: 0.5 } }, fx: [] },
];

const errors = (lines: readonly string[]): string[] => lines.filter((l) => l.startsWith('log:er:'));

describe('missing fixtures during playback (QA6)', () => {
  it('warns once per executor and cue across go, goto, the fader and the flash', () => {
    const w = rigWorld();
    const [, second, third] = w.pool.execs;
    if (!second || !third) throw new Error('missing executors');
    second.cues = cues();
    third.cues = cues();
    w.to('theatre');
    w.pool.go(second);
    second.goto(0);
    w.pool.setLevel(second, 0);
    w.pool.setLevel(second, 0.5);
    w.pool.flashPress(third);
    w.pool.flashRelease(third);
    w.pool.flashPress(third);
    w.pool.go(second);
    w.pool.go(second);
    expect(errors(w.lines)).toEqual([
      'log:er:Exec 2 Cue 1: 2 fixtures are not on this stage (skipped)',
      'log:er:Exec 3 Cue 1: 2 fixtures are not on this stage (skipped)',
    ]);
    const firstGo = w.lines.indexOf('log:er:Exec 2 Cue 1: 2 fixtures are not on this stage (skipped)');
    expect(w.lines[firstGo + 1]).toBe('log:ok:Exec 2: Cue 1 A');
  });

  it('warns again after a builder or show load apply, not after a preview, and not where every id exists', () => {
    const w = rigWorld();
    const [first] = w.pool.execs;
    if (!first) throw new Error('missing executor');
    first.cues = cues();
    const fire = (): void => first.goto(0);
    fire();
    w.to('theatre');
    fire();
    w.to('theatre', 'preview');
    fire();
    w.to('empty');
    fire();
    first.goto(1);
    w.to('theatre', 'showLoad');
    fire();
    fire();
    expect(errors(w.lines)).toEqual([
      'log:er:Exec 1 Cue 1: 2 fixtures are not on this stage (skipped)',
      'log:er:Exec 1 Cue 1: 3 fixtures are not on this stage (skipped)',
      'log:er:Exec 1 Cue 2: 1 fixture is not on this stage (skipped)',
      'log:er:Exec 1 Cue 1: 2 fixtures are not on this stage (skipped)',
    ]);
  });
});
