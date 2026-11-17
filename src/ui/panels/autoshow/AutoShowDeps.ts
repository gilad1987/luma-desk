import type { SongPlayer } from '../../../audio/SongPlayer';
import type { AutoShow } from '../../../autoshow/AutoShow';
import type { LookGenerator } from '../../../autoshow/LookGenerator';
import type { AppState } from '../../../engine/AppState';
import type { EngineBus } from '../../../engine/events';
import type { ExecutorPool } from '../../../engine/ExecutorPool';
import type { Tempo } from '../../../engine/Tempo';
import type { ShowStorage } from '../../../show/ShowStorage';
import type { SideTab } from '../side/sideTabsMarkup';

/** What the Auto Show pane drives: the auto-show and its song, and the executors its looks are saved into. */
export interface AutoShowDeps {
  readonly bus: EngineBus;
  readonly auto: AutoShow;
  /** The generator "build cue list" draws its looks from; the same one the auto-show plays from. */
  readonly looks: LookGenerator;
  readonly song: SongPlayer;
  readonly tempo: Tempo;
  readonly pool: ExecutorPool;
  readonly state: AppState;
  readonly storage: Pick<ShowStorage, 'persist'>;
  /** The visible side pane; the section line and the status repaint only while it is the auto pane. */
  readonly sideTab: () => SideTab;
}
