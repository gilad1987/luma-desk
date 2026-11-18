/**
 * When the pools repaint. The slots themselves are owned by the slot tests; here `render` is a spy, so the test reads
 * only which events reach it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../../src/core';
import { BUILT_IN_DESIGN } from '../../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import type { EngineEvents } from '../../../../../src/engine/events';
import { PoolsPanel } from '../../../../../src/ui/panels/pools/PoolsPanel';
import type { PoolsDeps } from '../../../../../src/ui/panels/pools/PoolsDeps';
import { asReal, FakeDom, FakeHost } from '../../../../shared/dom';

function setup() {
  const dom = new FakeDom();
  for (const id of ['groupPool', 'presetTabs', 'presetPool']) dom.add(id);
  const bus = new EventBus<EngineEvents>();
  const pools = new PoolsPanel(asReal<HTMLElement>(new FakeHost()), asReal<PoolsDeps>({ bus }));
  const render = vi.spyOn(pools, 'render').mockImplementation(() => undefined);
  return { bus, render };
}

describe('PoolsPanel repaint', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('repaints when the pools change', () => {
    const { bus, render } = setup();
    bus.emit('poolsChanged', undefined);
    expect(render).toHaveBeenCalledOnce();
  });

  it('repaints after a stage change, so unavailable presets are evaluated against the new stage', () => {
    const { bus, render } = setup();
    bus.emit('rigChanged', { design: BUILT_IN_DESIGN });
    expect(render).toHaveBeenCalledOnce();
  });
});
