import { describe, expect, it } from 'vitest';
import type { Cue } from '../../../../src/engine/CueList';
import type { PhaserInstance } from '../../../../src/engine/shared';
import { cueTable, execOptions } from '../../../../src/ui/panels/sequence/sequenceRows';

const phaser: PhaserInstance = { type: 'circle', rate: 1, size: 1, spread: 0, ids: [] };
interface CueCounts {
  readonly nVals?: number;
  readonly nFx?: number;
}
/** A cue with `nVals` fixture values and `nFx` phasers; the rows only show the counts. */
const cue = ({ num, name, fade, nVals = 0, nFx = 0 }: Pick<Cue, 'num' | 'name' | 'fade'> & CueCounts): Cue => ({
  num,
  name,
  fade,
  vals: Object.fromEntries(Array.from({ length: nVals }, (_, i) => [String(i), {}])),
  fx: Array.from({ length: nFx }, () => ({ ...phaser })),
});
type SequenceView = Parameters<typeof cueTable>[0];
const exec = (over: Partial<SequenceView>): SequenceView => ({ name: '', cues: [], cur: -1, on: false, ...over });
const HEAD = '<tr><th>Cue</th><th>Name</th><th>Fade</th><th>Content</th></tr>';

describe('sequence rows (same strings as the original renderSeq)', () => {
  it('lists executors with the selected one marked', () => {
    const execs = [exec({ name: 'Intro' }), exec({ cues: [cue({ num: 1, name: 'a', fade: 0 })] })];
    expect(execOptions(execs, 1)).toBe(
      '<option value="0" >Exec 1 — Intro (0)</option><option value="1" selected>Exec 2 — empty (1)</option>',
    );
  });

  it('marks the current and, while running, the next cue (wrapping)', () => {
    const cues = [
      cue({ num: 1, name: 'A', fade: 2, nVals: 3 }),
      cue({ num: 2.5, name: 'B', fade: 0, nVals: 1, nFx: 2 }),
    ];
    expect(cueTable(exec({ cues, cur: 1, on: true }))).toBe(
      HEAD +
        '<tr data-i="0" class="nxt"><td class="num">1</td><td class="name">A</td><td class="fade">2s</td>' +
        '<td class="info">3 fix</td></tr>' +
        '<tr data-i="1" class="cur"><td class="num">2.5</td><td class="name">B</td><td class="fade">0s</td>' +
        '<td class="info">1 fix · 2 fx</td></tr>',
    );
  });

  // The old `t.innerHTML += hint` re-parsed `<tbody>HEAD</tbody>` + hint, and the parser gives a `<tr>` after a
  // closed `<tbody>` a new implicit one: two bodies, which this markup states explicitly.
  it('shows the hint row in a second tbody when there are no cues, as the old innerHTML += did', () => {
    expect(cueTable(exec({}))).toBe(
      `<tbody>${HEAD}</tbody><tbody>` +
        '<tr><td colspan="4" style="color:var(--mut);padding:14px">No cues. Build a look in the programmer, then ' +
        'STORE → click this executor (or type <b>Store Cue 1</b>).</td></tr></tbody>',
    );
  });

  it('counts no phasers for a saved cue without its phaser list, as the original (c.fx || []) did', () => {
    // as JSON.parse gives it from a hand-edited show file: saved shows are not validated on load
    const saved = JSON.parse('{"num":1,"name":"A","fade":2,"vals":{"101":{}}}') as Cue;
    expect(cueTable(exec({ cues: [saved] }))).toContain('<td class="info">1 fix</td>');
  });

  it('keeps one implicit tbody when there are cues', () => {
    expect(cueTable(exec({ cues: [cue({ num: 1, name: 'A', fade: 2 })] }))).not.toContain('tbody');
  });
});
