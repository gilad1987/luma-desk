import { vi } from 'vitest';
import { EventBus } from '../../../../../src/core';
import { AppState } from '../../../../../src/engine/AppState';
import { Executor } from '../../../../../src/engine/Executor';
import type { EngineEvents, EngineMessage } from '../../../../../src/engine/events';
import { SequencePanel } from '../../../../../src/ui/panels/sequence/SequencePanel';
import type { SequenceDeps } from '../../../../../src/ui/panels/sequence/SequenceDeps';
import type { SideTab } from '../../../../../src/ui/panels/side/sideTabsMarkup';
import { StoreModeGuard } from '../../../../../src/ui/shared';
import { asReal, FakeButton, FakeDom, FakeElement, FakeHost } from '../../../../shared/dom';

/** A real executor named Wash with cues numbered `nums` and current index `cur`; it runs when `cur` is set. */
export function exec(nums: readonly number[], cur: number): Executor {
  const e = new Executor(false, { nowMs: () => 0, nowSeconds: () => 0 });
  e.name = 'Wash';
  e.cues = nums.map((num) => ({ num, name: `Q${num}`, fade: 2, vals: {}, fx: [] }));
  e.cur = cur;
  e.on = cur >= 0;
  return e;
}

/** Mounts the pane over `e` alone, with the given side pane showing; returns the panel, its table, logs and spies. */
export function mount(e: Executor, tab: SideTab = 'seq') {
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
  const state = new AppState(bus);
  const deps: SequenceDeps = {
    bus,
    state,
    execs: [e],
    pool: { go },
    programmer: { storeCue: vi.fn() },
    store: new StoreModeGuard(state),
    modal: { rename: vi.fn(), number: vi.fn() },
    runCommand,
    sideTab: () => tab,
  };
  const panel = new SequencePanel(asReal<HTMLElement>(new FakeHost()), deps);
  const click = (id: string): void => dom.get(id).onclick?.({ target: null });
  return { panel, table, messages, runCommand, go, click };
}
