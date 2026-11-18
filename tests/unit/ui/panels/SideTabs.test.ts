import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../src/core';
import type { EngineEvents } from '../../../../src/engine/events';
import type { LayoutMode } from '../../../../src/ui/panels/layoutMode';
import { SideTabs } from '../../../../src/ui/panels/side/SideTabs';
import { sideTabsMarkup } from '../../../../src/ui/panels/side/sideTabsMarkup';
import { asReal, FakeButton, FakeDom, FakeElement, FakeHost } from '../../../shared/dom';

describe('SideTabs', () => {
  let bus: EventBus<EngineEvents>, host: FakeHost, buttons: FakeButton[], panes: FakeElement[], mode: LayoutMode;
  let tabs: SideTabs;
  beforeEach(() => {
    new FakeDom();
    panes = ['pools', 'auto', 'seq', 'sheet'].map((t) => Object.assign(new FakeElement(), { id: 'pane-' + t }));
    Object.assign(document, { querySelectorAll: () => panes });
    bus = new EventBus<EngineEvents>();
    host = new FakeHost();
    buttons = [0, 1, 2, 3].map(() => new FakeButton('button'));
    host.found.set('#sideTabs button', buttons);
    mode = 'desk';
    tabs = new SideTabs(asReal<HTMLElement>(host), bus, () => mode);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders its markup and starts on Pools', () => {
    expect(host.html).toBe(sideTabsMarkup);
    expect(tabs.current).toBe('pools');
  });

  it('a click shows one pane, lights one tab and asks for a repaint', () => {
    const dirty = vi.fn();
    bus.on('stateDirty', dirty);
    buttons[2]?.click();
    expect(tabs.current).toBe('seq');
    expect(buttons.map((b) => b.classList.contains('on'))).toEqual([false, false, true, false]);
    expect(panes.map((p) => p.classList.contains('on'))).toEqual([false, false, true, false]);
    expect(dirty).toHaveBeenCalledOnce();
  });

  it('show() never selects Pools in the MA layout (quirk Q19)', () => {
    tabs.show('sheet');
    mode = 'ma';
    tabs.show('pools');
    expect(tabs.current).toBe('sheet');
    mode = 'classic';
    tabs.show('pools');
    expect(tabs.current).toBe('pools');
  });
});
