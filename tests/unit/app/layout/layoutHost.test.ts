import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { layoutHost } from '../../../../src/app/layout/layoutHost';
import { EventBus } from '../../../../src/core';
import { AppState } from '../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../src/engine/events';
import { StoreModeGuard } from '../../../../src/ui/shared';
import { FakeDom, FakeElement } from '../../../shared/dom';

const setup = () => {
  const deps = {
    sideTabs: { current: 'pools' as const, show: vi.fn() },
    encoders: { render: vi.fn(), delta: vi.fn(), feature: 'dim' as const },
    commandLine: { value: '', pushHistory: vi.fn(), run: vi.fn() },
    storeMode: new StoreModeGuard(new AppState(new EventBus<EngineEvents>())),
    stageRenderer: { resize: vi.fn(), setConsoleHeight: vi.fn() },
    views: { currentView: 'foh' as const },
    setView: vi.fn(),
    layoutPrefs: { load: () => null, save: vi.fn() },
    building: false,
    builderOpen: () => deps.building,
  };
  return { deps, host: layoutHost(deps) };
};

describe('layoutHost', () => {
  let dom: FakeDom;
  beforeEach(() => (dom = new FakeDom()));
  afterEach(() => vi.unstubAllGlobals());

  it('builds the keypad once, on first use', () => {
    const { host } = setup();
    expect(dom.created).toHaveLength(0);
    const pad = host.keypad();
    expect(pad.className).toBe('keypad');
    expect(host.keypad()).toBe(pad);
    expect(dom.created.filter((e) => e.className === 'keypad')).toHaveLength(1);
  });

  it('removes the keypad only once it exists', () => {
    const { host } = setup();
    expect(() => host.removeKeypad()).not.toThrow();
    host.keypad();
    const pad = dom.created.find((e) => e.className === 'keypad'),
      slot = new FakeElement();
    if (!pad) throw new Error('no keypad was built');
    slot.appendChild(pad);
    host.removeKeypad();
    expect(slot.children).toHaveLength(0);
  });

  it('forwards the console height, resize, encoders and view calls', () => {
    const { deps, host } = setup();
    host.setConsoleHeight(312.5);
    host.resize();
    host.renderEncoders();
    host.setView('foh', true);
    expect(deps.stageRenderer.setConsoleHeight).toHaveBeenCalledWith(312.5);
    expect(deps.stageRenderer.resize).toHaveBeenCalledOnce();
    expect(deps.encoders.render).toHaveBeenCalledOnce();
    expect(deps.setView).toHaveBeenCalledWith('foh', true);
    expect(host.currentView()).toBe('foh');
    expect(host.sideTabs).toBe(deps.sideTabs);
    expect(host.prefs).toBe(deps.layoutPrefs);
  });

  it('passes console height 0 while the Stage Builder is open, so a refit cannot shrink the 3D view', () => {
    const { deps, host } = setup();
    deps.building = true;
    host.setConsoleHeight(312.5);
    deps.building = false;
    host.setConsoleHeight(200);
    expect(deps.stageRenderer.setConsoleHeight.mock.calls).toEqual([[0], [200]]);
  });
});
