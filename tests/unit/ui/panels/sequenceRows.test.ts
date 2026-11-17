import { describe, expect, it } from 'vitest';
import type { Executor } from '../../../../src/engine/Executor';
import { cueTable, execOptions } from '../../../../src/ui/panels/sequence/sequenceRows';

const cue = (num: number, name: string, fade: number, nVals: number, nFx: number) => ({
  num,
  name,
  fade,
  vals: Object.fromEntries(Array.from({ length: nVals }, (_, i) => [String(i), {}])),
  fx: Array.from({ length: nFx }, () => ({})),
});
const exec = (over: Partial<Executor>): Executor => ({ name: '', cues: [], cur: -1, on: false, ...over }) as Executor;
const HEAD = '<tr><th>Cue</th><th>Name</th><th>Fade</th><th>Content</th></tr>';

describe('sequence rows (same strings as the original renderSeq)', () => {
  it('lists executors with the selected one marked', () => {
    const execs = [exec({ name: 'Intro' }), exec({ cues: [cue(1, 'a', 0, 0, 0)] as Executor['cues'] })];
    expect(execOptions(execs, 1)).toBe(
      '<option value="0" >Exec 1 — Intro (0)</option><option value="1" selected>Exec 2 — empty (1)</option>',
    );
  });

  it('marks the current and, while running, the next cue (wrapping)', () => {
    const cues = [cue(1, 'A', 2, 3, 0), cue(2.5, 'B', 0, 1, 2)] as Executor['cues'];
    expect(cueTable(exec({ cues, cur: 1, on: true }))).toBe(
      HEAD +
        '<tr data-i="0" class="nxt"><td class="num">1</td><td class="name">A</td><td class="fade">2s</td>' +
        '<td class="info">3 fix</td></tr>' +
        '<tr data-i="1" class="cur"><td class="num">2.5</td><td class="name">B</td><td class="fade">0s</td>' +
        '<td class="info">1 fix · 2 fx</td></tr>',
    );
  });

  it('shows the hint row when there are no cues', () => {
    expect(cueTable(exec({}))).toBe(
      HEAD +
        '<tr><td colspan="4" style="color:var(--mut);padding:14px">No cues. Build a look in the programmer, then ' +
        'STORE → click this executor (or type <b>Store Cue 1</b>).</td></tr>',
    );
  });
});
