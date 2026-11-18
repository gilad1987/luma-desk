import { describe, expect, it } from 'vitest';
import { createShowLoaded } from '../../../../src/app/ui/showLoaded';
import { EventBus } from '../../../../src/core';
import type { EngineEvents } from '../../../../src/engine/events';

// legacy: showLoaded in main.ts at 3cbff92 lines 1288-1293
describe('createShowLoaded', () => {
  it('syncs the haze slider, then repaints the pools, then asks for a full repaint', () => {
    const bus = new EventBus<EngineEvents>();
    const calls: string[] = [];
    bus.on('stateDirty', () => calls.push('stateDirty'));
    const showLoaded = createShowLoaded({
      bus,
      topBar: { syncHaze: () => calls.push('haze') },
      pools: { render: () => calls.push('pools') },
    });
    showLoaded();
    expect(calls).toEqual(['haze', 'pools', 'stateDirty']);
  });
});
