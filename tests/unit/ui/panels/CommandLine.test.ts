import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../src/core';
import { AppState } from '../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../src/engine/events';
import type { Executor } from '../../../../src/engine/Executor';
import { CommandLine } from '../../../../src/ui/panels/command/CommandLine';
import type { CommandLineDeps } from '../../../../src/ui/panels/command/CommandLineDeps';
import { commandLineMarkup } from '../../../../src/ui/panels/command/commandLineMarkup';
import { Modal, StoreModeGuard } from '../../../../src/ui/shared';
import type { FakeElement } from '../fakes/FakeElement';
import { FakeDom } from '../fakes/installFakeDom';
import { FakeButton, FakeList } from './fakes/FakeButton';
import { FakeHost } from './fakes/FakeHost';

const KEYS = ['kStore', 'kClear', 'kHigh', 'kFan', 'kAll', 'kOdd', 'kEven', 'kRev'];

describe('CommandLine', () => {
  let dom: FakeDom, input: FakeElement, state: AppState, deps: CommandLineDeps, line: CommandLine, host: FakeHost;
  const key = (k: string) => {
    const preventDefault = vi.fn();
    input.onkeydown?.({ key: k, preventDefault } as { key: string });
    return preventDefault;
  };
  beforeEach(() => {
    dom = new FakeDom();
    input = dom.add('cmd');
    Object.assign(input, { blur: vi.fn() });
    dom.add('cmdFb', new FakeList());
    for (const id of [...KEYS, 'modal', 'mbox']) dom.add(id, new FakeButton());
    const bus = new EventBus<EngineEvents>();
    state = new AppState(bus);
    const go = vi.fn();
    deps = {
      bus,
      state,
      store: new StoreModeGuard(state),
      modal: new Modal(bus),
      runCommand: vi.fn(),
      execs: [{} as Executor],
      pool: { go },
      fanToggled: vi.fn(),
      guideOrTourOpen: () => false,
    } as unknown as CommandLineDeps;
    host = new FakeHost();
    line = new CommandLine(host as unknown as HTMLElement, deps);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the command area first in its host', () => {
    host.html = '<div id="execs"></div>';
    new CommandLine(host as unknown as HTMLElement, deps);
    expect(host.html).toBe(commandLineMarkup + '<div id="execs"></div>');
  });

  it('Enter runs and clears; a bare store arms store mode without preventDefault', () => {
    input.value = 'Group 2 At 80';
    expect(key('Enter')).toHaveBeenCalled();
    expect(deps.runCommand).toHaveBeenCalledWith('Group 2 At 80');
    input.value = ' Store ';
    expect(key('Enter')).not.toHaveBeenCalled();
    expect([state.storeMode, input.value]).toEqual([true, '']);
    expect(key('ArrowUp')).toHaveBeenCalled();
    expect(input.value).toBe(' Store ');
  });

  it('Escape clears, blurs and leaves store mode', () => {
    state.setStoreMode(true);
    input.value = 'Fix';
    key('Escape');
    expect([input.value, state.storeMode]).toEqual(['', false]);
  });

  it('CLEAR empties a half-typed line first, FAN tells the encoders, fast() lights the keys', () => {
    input.value = 'Fixture 1';
    dom.get('kClear').onclick?.({ target: null });
    expect(input.value).toBe('');
    dom.get('kFan').onclick?.({ target: null });
    expect(deps.fanToggled).toHaveBeenCalledOnce();
    expect(dom.get('kFan').classList.contains('on')).toBe(false);
    line.fast();
    expect(dom.get('kFan').classList.contains('on')).toBe(true);
  });

  it('keeps the last two log lines', () => {
    for (const text of ['a', 'b', 'c']) deps.bus.emit('message', { kind: 'log', text, level: 'ok' });
    expect(dom.get('cmdFb').children.map((c) => c.innerHTML)).toEqual([
      '<span class="ok">b</span>',
      '<span class="ok">c</span>',
    ]);
  });

  it('Space on the page is GO+ on the selected executor', () => {
    const preventDefault = vi.fn();
    dom.documentClicks.at(-1)?.({ target: null, code: 'Space', key: ' ', preventDefault } as { target: null });
    expect(preventDefault).toHaveBeenCalled();
    expect((deps.pool as unknown as { go: ReturnType<typeof vi.fn> }).go).toHaveBeenCalledWith(deps.execs[0], 1);
  });
});
