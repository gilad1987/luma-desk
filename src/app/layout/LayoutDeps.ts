import type { Rig } from '../../domain/rig/Rig';
import type { AppState } from '../../engine/AppState';
import type { EngineBus } from '../../engine/events';
import type { Executor } from '../../engine/Executor';
import type { Programmer } from '../../engine/Programmer';
import type { Selection } from '../../engine/Selection';
import type { CameraViews } from '../../render/camera/CameraViews';
import type { StageRenderer } from '../../render/stage/StageRenderer';
import type { LayoutPrefs } from '../../show';
import type { AimHeight } from '../../ui/components/AimHeight';
import type { CommandInput } from '../../ui/components/pressKey';
import type { EncodersPanel } from '../../ui/panels/encoders/EncodersPanel';
import type { SideTabs } from '../../ui/panels/side/SideTabs';
import type { StoreModeGuard } from '../../ui/shared';

/**
 * Everything the layouts and the MA hardware use from the rest of the app. The field names are the old `main.ts`
 * variables, so the composition root maps them one to one; `rig` replaces the old `FX` lookup.
 */
export interface LayoutDeps {
  readonly bus: EngineBus;
  readonly programmer: Pick<Programmer, 'vals' | 'set' | 'colorTargets'>;
  readonly selection: Pick<Selection, 'ids'>;
  readonly rig: Pick<Rig, 'get'>;
  readonly aimHeight: AimHeight;
  readonly appState: Pick<AppState, 'selExec'>;
  readonly execs: readonly Pick<Executor, 'name'>[];
  readonly sideTabs: Pick<SideTabs, 'current' | 'show'>;
  readonly encoders: Pick<EncodersPanel, 'render' | 'delta'>;
  /** The encoder feature tab (the old `feat`); EncodersPanel keeps it private, so the root passes a reader. */
  readonly feature: () => string;
  /** The command line the keypad types into (the old `cmd` with `hist` and `runner`). */
  readonly commandLine: CommandInput;
  /** The STORE mode the keypad's bare "Store" ENTER switches on. */
  readonly storeMode: StoreModeGuard;
  readonly stageRenderer: Pick<StageRenderer, 'resize' | 'setConsoleHeight'>;
  readonly views: Pick<CameraViews, 'currentView'>;
  /** The saved layout store the show files wiring builds (the old `layoutPrefs`). */
  readonly layoutPrefs: Pick<LayoutPrefs, 'load' | 'save'>;
  /** The old `setView`: it ignores names that are not views. */
  readonly setView: (view: string, instant: boolean) => void;
}
