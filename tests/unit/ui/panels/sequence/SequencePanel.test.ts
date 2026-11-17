import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../../src/core';
import { AppState } from '../../../../../src/engine/AppState';
import type { EngineEvents, EngineMessage } from '../../../../../src/engine/events';
import { SequencePanel } from '../../../../../src/ui/panels/sequence/SequencePanel';
import type { SequenceDeps } from '../../../../../src/ui/panels/sequence/SequenceDeps';
import type { SideTab } from '../../../../../src/ui/panels/side/sideTabsMarkup';
import { asReal } from '../../fakes/asReal';
import { FakeButton } from '../../fakes/FakeButton';
import { FakeElement } from '../../fakes/FakeElement';
import { FakeHost } from '../../fakes/FakeHost';
import { FakeDom } from '../../fakes/installFakeDom';

/** An executor with only what the pane reads: its cues (by number), the current index and the run state. */
const exec = (nums: readonly number[], cur: number) => ({
  name: 'Wash',
  cues: nums.map((num) => ({ num, name: `Q${num}`, fade: 2, vals: {}, fx: [] })),
  cur,
  on: cur >= 0,
});

function mount(e: ReturnType<typeof exec>, tab: SideTab = 'seq') {
  const dom = new FakeDom();
  vi.stubGlobal('HTMLSelectElement', FakeElement);
  dom.add('seqSel');
  const table = dom.add('seqTable', new FakeHost());
  for (const id of ['seqGo', 'seqBack', 'seqDel']) dom.add(id, new FakeButton());
  const bus = new EventBus<EngineEvents>(),
    messages: EngineMessage[] = [];
  bus.on('message', (m) => messages.push(m));
  const runCommand = vi.fn(),
    go = vi.fn();
  const deps = {
    bus,
    state: new AppState(bus),
    execs: [e],
    pool: { go },
    runCommand,
    sideTab: () => tab,
  } as unknown as SequenceDeps;
  const panel = new SequencePanel(asReal<HTMLElement>(new FakeHost()), deps);
  const click = (id: string): void => dom.get(id).onclick?.({ target: null });
  return { panel, table, messages, runCommand, go, click };
}

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
