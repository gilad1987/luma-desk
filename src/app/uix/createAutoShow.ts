import { SongPlayer } from '../../audio/SongPlayer';
import { AutoShow } from '../../autoshow/AutoShow';
import { LookGenerator } from '../../autoshow/LookGenerator';
import type { Clock } from '../../core';
import type { Rig } from '../../domain/rig';
import type { AppState } from '../../engine/AppState';
import type { EngineBus } from '../../engine/events';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import type { Programmer } from '../../engine/Programmer';
import type { Tempo } from '../../engine/Tempo';
import type { ShowStorage } from '../../show';
import { AutoShowPanel } from '../../ui/panels/autoshow/AutoShowPanel';
import type { SideTab } from '../../ui/panels/side/sideTabsMarkup';

/** The engine side of the auto-show, named as the composition root names it. */
export interface AutoShowEngineDeps {
  readonly rig: Rig;
  readonly pool: ExecutorPool;
  readonly programmer: Pick<Programmer, 'hasContent'>;
  readonly tempo: Tempo;
  readonly clock: Clock;
  readonly bus: EngineBus;
}

/** What the pane adds when the "ui" area mounts it. */
export interface AutoShowPanelDeps {
  readonly appState: AppState;
  readonly showStorage: Pick<ShowStorage, 'persist'>;
  /** The visible side pane, from `SideTabs`. */
  readonly sideTab: () => SideTab;
}

/** The auto-show objects the frame loop, the HUD and the recorder read, and the pane mount for the "ui" area. */
export interface AutoShowHandles {
  readonly looks: LookGenerator;
  readonly songPlayer: SongPlayer;
  readonly autoShow: AutoShow;
  /**
   * Renders the Auto Show pane at the end of `host` (`#side`) and wires it. Call it after `PoolsPanel` and before
   * `SequencePanel`. Its `fast(now)` replaces the original `updateAutoUI(now)` in the fast UI tick.
   */
  readonly mountPanel: (host: HTMLElement, deps: AutoShowPanelDeps) => AutoShowPanel;
}

/**
 * Builds the look generator, the song player and the auto-show. Building them draws no random number and creates no
 * three.js object (the generator only keeps `Math.random` for later looks), so the root may build them before the
 * UI. The auto-show repaints its pane and the song resets its play button through the pane mounted later; until it
 * is mounted there is no pane to paint, and nothing at boot starts Auto or plays a song.
 */
export function createAutoShow(deps: AutoShowEngineDeps): AutoShowHandles {
  const { pool, programmer, tempo, clock, bus } = deps;
  let panel: AutoShowPanel | undefined;
  const looks = new LookGenerator(deps.rig, Math.random);
  const songPlayer = new SongPlayer(clock, () => panel?.songEnded());
  const autoShow = new AutoShow({
    pool,
    programmer,
    tempo,
    clock,
    looks,
    bus,
    bassLevel: () => songPlayer.bassLevel(),
    onChange: () => panel?.renderStyles(),
  });
  const mountPanel = (host: HTMLElement, { appState, showStorage, sideTab }: AutoShowPanelDeps): AutoShowPanel => {
    const mounted = new AutoShowPanel(host, {
      bus,
      auto: autoShow,
      looks,
      song: songPlayer,
      tempo,
      pool,
      state: appState,
      storage: showStorage,
      sideTab,
    });
    panel = mounted;
    return mounted;
  };
  return { looks, songPlayer, autoShow, mountPanel };
}
