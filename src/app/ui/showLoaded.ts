import type { EngineBus } from '../../engine/events';
import type { PoolsPanel } from '../../ui/panels/pools/PoolsPanel';
import type { TopBar } from '../../ui/panels/top/TopBar';

/** The panels a show load repaints. */
export interface ShowLoadedDeps {
  readonly bus: EngineBus;
  readonly topBar: Pick<TopBar, 'syncHaze'>;
  readonly pools: Pick<PoolsPanel, 'render'>;
}

/**
 * The old `showLoaded`: after any show load (boot restore, file import, demo), the Haze slider, then the pools, then
 * a full repaint on the next frame. A load emits no event of its own, so the caller runs this. Pass it as the
 * `repaint` of `restoreShow` and call it after `serializer.load` in the show file's `loadShow`.
 */
export function createShowLoaded({ bus, topBar, pools }: ShowLoadedDeps): () => void {
  return () => {
    topBar.syncHaze();
    pools.render();
    bus.emit('stateDirty', undefined);
  };
}
