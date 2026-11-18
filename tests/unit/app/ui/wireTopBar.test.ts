import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireTopBar } from '../../../../src/app/ui/wireTopBar';
import { EventBus } from '../../../../src/core';
import { AppState } from '../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../src/engine/events';
import { asReal, FakeButton, FakeDom, FakeHost } from '../../../shared/dom';

/** The render objects with their start values: glow on, key lights on, ids off. */
function renderFakes() {
  const calls: string[] = [];
  const stageRenderer = {
    glow: true,
    showsIds: false,
    setGlow: (on: boolean) => {
      stageRenderer.glow = on;
      calls.push(`glow ${on}`);
    },
    setShadows: (on: boolean) => void calls.push(`shadows ${on}`),
    setShowIds: (on: boolean) => {
      stageRenderer.showsIds = on;
      calls.push(`ids ${on}`);
    },
  };
  const keyLights = {
    enabled: true,
    setEnabled: (on: boolean) => {
      keyLights.enabled = on;
      calls.push(`keys ${on}`);
    },
  };
  return { calls, stageRenderer, keyLights };
}

// legacy: main.ts at 3cbff92 lines 1135-1154 (#house, #glowBtn, #realBtn, #idsBtn)
describe('wireTopBar', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('flips each toggle from the state its render object owns, real light keys first then shadows', () => {
    const dom = new FakeDom();
    for (const id of ['house', 'haze', 'glowBtn', 'realBtn', 'idsBtn']) dom.add(id, new FakeButton());
    for (const id of ['glowBtn', 'realBtn']) dom.get(id).classList.add('on');
    const { calls, stageRenderer, keyLights } = renderFakes();
    const setHouseLevel = vi.fn();
    wireTopBar({
      app: asReal<HTMLElement>(new FakeHost()),
      appState: new AppState(new EventBus<EngineEvents>()),
      views: { setView: vi.fn() },
      sceneLights: { setHouseLevel },
      stageRenderer,
      keyLights,
    });
    for (const id of ['realBtn', 'glowBtn', 'idsBtn']) dom.get(id).onclick?.({ target: null });
    expect(calls).toEqual(['keys false', 'shadows false', 'glow false', 'ids true']);
    expect(['glowBtn', 'realBtn', 'idsBtn'].map((id) => dom.get(id).classList.contains('on'))).toEqual([
      false,
      false,
      true,
    ]);
    // a change made by the owner elsewhere is what the next click flips
    stageRenderer.setShowIds(false);
    dom.get('idsBtn').onclick?.({ target: null });
    expect(stageRenderer.showsIds).toBe(true);
    dom.get('house').value = '30';
    asReal<{ readonly oninput: () => void }>(dom.get('house')).oninput();
    expect(setHouseLevel).toHaveBeenCalledWith(0.3);
  });
});
