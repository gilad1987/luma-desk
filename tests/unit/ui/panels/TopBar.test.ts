import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../src/core';
import { AppState } from '../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../src/engine/events';
import { TopBar, type TopBarRender } from '../../../../src/ui/panels/top/TopBar';
import { topBarMarkup } from '../../../../src/ui/panels/top/topBarMarkup';
import { FakeDom } from '../fakes/installFakeDom';
import { FakeButton } from './fakes/FakeButton';
import { FakeHost } from './fakes/FakeHost';

describe('TopBar', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders first in #app and drives views, sliders and toggles', () => {
    const dom = new FakeDom();
    for (const id of ['house', 'haze', 'glowBtn', 'realBtn', 'idsBtn']) dom.add(id, new FakeButton());
    const host = new FakeHost();
    host.html = '<main id="main"></main>';
    const views = [0, 1, 2].map(() => new FakeButton('button'));
    host.found.set('[data-view]', views);
    const setView = vi.fn(),
      setRealLight = vi.fn();
    const render: TopBarRender = { setView, setHouseLevel: vi.fn(), setGlow: vi.fn(), setRealLight };
    const state = new AppState(new EventBus<EngineEvents>());
    const bar = new TopBar(host as unknown as HTMLElement, state, render);
    expect(host.html).toBe(topBarMarkup + '<main id="main"></main>');
    views[2]?.click();
    expect(setView).toHaveBeenCalledWith('stage');
    dom.get('haze').value = '40';
    (dom.get('haze') as unknown as { oninput: () => void }).oninput();
    expect(state.haze).toBe(0.4);
    dom.get('realBtn').onclick?.({ target: null });
    expect(setRealLight).toHaveBeenCalledWith(false);
    expect(dom.get('realBtn').classList.contains('on')).toBe(false);
    expect(bar.showIds).toBe(false);
    dom.get('idsBtn').onclick?.({ target: null });
    expect([bar.showIds, dom.get('idsBtn').classList.contains('on')]).toEqual([true, true]);
  });
});
