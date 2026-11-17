import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../src/core';
import { AppState } from '../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../src/engine/events';
import { recordEvents } from './recordEvents';

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  return { state: new AppState(bus), events: recordEvents(bus) };
};

describe('AppState', () => {
  it('starts with the original defaults (index.html 1532, 1536, 1836; haze 1256)', () => {
    const { state } = setup();
    expect(state).toMatchObject({ gm: 1, blackout: false, highlight: false, fanMode: false, haze: 0.62 });
    expect(state.storeMode).toBe(false);
    expect(state.selExec).toBe(0);
  });

  it('store mode on: announces the mode first, then logs the prompt (DOM toggle came before log in setStore)', () => {
    const { state, events } = setup();
    state.setStoreMode(true);
    expect(state.storeMode).toBe(true);
    expect(events).toEqual([
      'storeModeChanged:true',
      'log::STORE — click an executor, cue, group or preset slot (or type)',
    ]);
  });

  it('store mode off: announces the mode and logs nothing, even when it was already off', () => {
    const { state, events } = setup();
    state.setStoreMode(false);
    state.setStoreMode(true);
    state.setStoreMode(false);
    expect(state.storeMode).toBe(false);
    expect(events.filter((e) => e.startsWith('storeModeChanged'))).toEqual([
      'storeModeChanged:false',
      'storeModeChanged:true',
      'storeModeChanged:false',
    ]);
    expect(events.filter((e) => e.startsWith('log'))).toHaveLength(1);
  });

  it('selectExec stores the index unclamped and asks for a repaint (callers clamp, as before)', () => {
    const { state, events } = setup();
    state.selectExec(4);
    expect(state.selExec).toBe(4);
    state.selectExec(12);
    expect(state.selExec).toBe(12);
    expect(events).toEqual(['stateDirty', 'stateDirty']);
  });

  it('plain fields change without events, as the original assignments did', () => {
    const { state, events } = setup();
    state.gm = 0.5;
    state.blackout = !state.blackout;
    state.highlight = !state.highlight;
    state.fanMode = !state.fanMode;
    state.haze = 0.1;
    expect(state).toMatchObject({
      gm: 0.5,
      blackout: true,
      highlight: true,
      fanMode: true,
      haze: 0.1,
    });
    expect(events).toEqual([]);
  });

  it('rejects writes to the setter-guarded fields', () => {
    const { state } = setup();
    expect(() => Object.assign(state, { storeMode: true })).toThrow(TypeError);
    expect(() => Object.assign(state, { selExec: 3 })).toThrow(TypeError);
  });
});
