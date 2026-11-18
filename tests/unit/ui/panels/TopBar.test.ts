import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../src/core';
import { AppState } from '../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../src/engine/events';
import { type RenderToggle, TopBar, type TopBarRender } from '../../../../src/ui/panels/top/TopBar';
import { topBarMarkup } from '../../../../src/ui/panels/top/topBarMarkup';
import { asReal, FakeButton, FakeDom, FakeHost } from '../../../shared/dom';

/** A render flag owned outside the bar, as the renderer owns glow, real light and the ids. */
function flag(start: boolean): RenderToggle {
  let on = start;
  return { isOn: () => on, set: (v) => (on = v) };
}

describe('TopBar', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders first in #app and drives views, sliders and toggles', () => {
    const dom = new FakeDom();
    for (const id of ['house', 'haze', 'glowBtn', 'realBtn', 'idsBtn']) dom.add(id, new FakeButton());
    const host = new FakeHost();
    host.html = '<main id="main"></main>';
    const views = [0, 1, 2].map(() => new FakeButton('button'));
    host.found.set('[data-view]', views);
    const setView = vi.fn();
    const realLight = flag(true),
      fixtureIds = flag(false);
    const render: TopBarRender = { setView, setHouseLevel: vi.fn(), glow: flag(true), realLight, fixtureIds };
    const state = new AppState(new EventBus<EngineEvents>());
    const bar = new TopBar(asReal<HTMLElement>(host), state, render);
    expect(host.html).toBe(topBarMarkup + '<main id="main"></main>');
    views[2]?.click();
    expect(setView).toHaveBeenCalledWith('stage');
    dom.get('haze').value = '40';
    asReal<{ readonly oninput: () => void }>(dom.get('haze')).oninput();
    expect(state.haze).toBe(0.4);
    dom.get('realBtn').onclick?.({ target: null });
    expect([realLight.isOn(), dom.get('realBtn').classList.contains('on')]).toEqual([false, false]);
    dom.get('idsBtn').onclick?.({ target: null });
    expect([fixtureIds.isOn(), dom.get('idsBtn').classList.contains('on')]).toEqual([true, true]);
    // the button reads the owner's flag on each click, so a change made elsewhere is not undone
    fixtureIds.set(false);
    dom.get('idsBtn').onclick?.({ target: null });
    expect(fixtureIds.isOn()).toBe(true);
    state.haze = 0.62;
    bar.syncHaze();
    expect(dom.get('haze').value).toBe('62');
  });
});
