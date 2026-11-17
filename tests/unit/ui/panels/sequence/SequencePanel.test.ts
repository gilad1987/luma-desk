import { afterEach, describe, expect, it, vi } from 'vitest';
import { exec, mount } from './sequenceFakes';

describe('SequencePanel (same behaviour as the original sequence pane)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Delete Cue without a current cue toasts and runs no command', () => {
    const { click, messages, runCommand } = mount(exec([1, 2], -1));
    click('seqDel');
    expect(messages).toEqual([{ kind: 'toast', text: 'Goto the cue you want to delete first' }]);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('Delete Cue runs the command line with the number of the current cue', () => {
    const { click, runCommand } = mount(exec([1, 2.5], 1));
    click('seqDel');
    expect(runCommand).toHaveBeenCalledWith('Delete Cue 2.5');
  });

  it('Delete Cue with a stale current index throws and runs nothing, as the old e.cues[e.cur].num did', () => {
    const { click, runCommand, messages } = mount(exec([1, 2], 2));
    expect(() => click('seqDel')).toThrow(RangeError);
    expect(() => click('seqDel')).toThrow('No cue at index 2 (list has 2)');
    expect([runCommand.mock.calls, messages]).toEqual([[], []]);
  });

  it('GO+ and GO− step the selected executor', () => {
    const e = exec([1], 0);
    const { click, go } = mount(e);
    click('seqGo');
    click('seqBack');
    expect(go.mock.calls).toEqual([
      [e, 1],
      [e, -1],
    ]);
  });

  it('an empty sequence writes the header and the hint row into two tbody elements', () => {
    const { panel, table } = mount(exec([], -1));
    panel.render();
    expect(table.innerHTML.match(/<tbody>/g)).toHaveLength(2);
    expect(table.innerHTML.startsWith('<tbody><tr><th>Cue</th>')).toBe(true);
    expect(table.innerHTML).toContain('</tbody><tbody><tr><td colspan="4"');
  });

  it('repaints on the slow tick only while the sequence pane shows', () => {
    const shown = mount(exec([1], 0));
    shown.panel.slow();
    expect(shown.table.innerHTML).toContain('data-i="0"');
    vi.unstubAllGlobals();
    const hidden = mount(exec([1], 0), 'sheet');
    hidden.panel.slow();
    expect(hidden.table.innerHTML).toBe('');
  });
});
