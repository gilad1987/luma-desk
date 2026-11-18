import type { AutoShow } from '../../autoshow/AutoShow';
import type { CommandRunner } from '../../command/CommandRunner';
import type { Fixture } from '../../domain/Fixture';
import type { AppState } from '../../engine/AppState';
import type { Executor } from '../../engine/Executor';
import type { ExecutorPool } from '../../engine/ExecutorPool';
import type { OutputMerger } from '../../engine/OutputMerger';
import type { Programmer } from '../../engine/Programmer';
import type { Selection } from '../../engine/Selection';
import type { StageService } from '../../engine/stage/StageService';
import type { ShowSerializer } from '../../show';
import type { LayoutMode } from '../../ui/panels/layoutMode';

/** What the Playwright test API reads and drives; names follow the legacy main.ts variables. */
export interface TestHookDeps {
  readonly fixtures: readonly Fixture[];
  /** The stage's `setView`: the screenshot suite moves the camera with it. */
  readonly setView: (view: string, instant?: boolean) => void;
  readonly selection: Pick<Selection, 'ids'>;
  readonly programmer: Pick<Programmer, 'vals' | 'fxList' | 'applyPhaser'>;
  readonly appState: Pick<AppState, 'selExec' | 'highlight' | 'blackout'>;
  readonly execs: readonly Pick<Executor, 'name' | 'cur' | 'on' | 'level' | 'cues'>[];
  readonly serializer: Pick<ShowSerializer, 'serialize'>;
  readonly pool: Pick<ExecutorPool, 'stepFades'>;
  readonly merger: Pick<OutputMerger, 'compute'>;
  readonly autoShow: Pick<AutoShow, 'modulation'>;
  readonly runner: Pick<CommandRunner, 'run'>;
  /** The current console layout (`deskMode`), owned by the layout area. */
  readonly deskMode: () => LayoutMode;
  /** The stage service; `stage()` reads its design and rig live. */
  readonly stage: Pick<StageService, 'design' | 'rig'>;
  /** Resolves after the latest MVR load ended, with success or failure (the MVR load queue). */
  readonly mvrReady: () => Promise<void>;
}
