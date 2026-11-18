/**
 * When the pools repaint. The slots themselves are owned by the slot tests; here `render` is a spy, so the test reads
 * only which events reach it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../../src/core';
import { createTemplate } from '../../../../../src/domain/stage/templates';
import type { EngineEvents } from '../../../../../src/engine/events';
import { GroupLibrary } from '../../../../../src/engine/GroupLibrary';
import { StageGroups } from '../../../../../src/engine/stage/StageGroups';
import { StageService } from '../../../../../src/engine/stage/StageService';
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

  it('repaints once on a template apply, through the poolsChanged that StageGroups emits', () => {
    const { bus, render } = setup();
    const service = new StageService(bus, { builtIn: createTemplate('sultans-pool'), tooManyFixtures: String });
    new StageGroups(bus, service, new GroupLibrary(bus));
    service.apply(createTemplate('theatre'), 'builder');
    expect(render).toHaveBeenCalledOnce();
  });

  it('does not repaint on a show load stage change, which the app repaints through showLoaded', () => {
    const { bus, render } = setup();
    const service = new StageService(bus, { builtIn: createTemplate('sultans-pool'), tooManyFixtures: String });
    new StageGroups(bus, service, new GroupLibrary(bus));
    service.apply(createTemplate('theatre'), 'showLoad');
    expect(render).not.toHaveBeenCalled();
  });
});
