import type { ConsoleInfoState } from '../../ui/layouts/consoleInfoTexts';
import type { LayoutDeps } from './LayoutDeps';

/** The part of {@link LayoutDeps} the console info labels read. */
export type ConsoleInfoDeps = Pick<LayoutDeps, 'sideTabs' | 'feature' | 'selection' | 'appState' | 'execs'>;

/**
 * Reads the console label state at call time, every 250 ms. An executor without a name reads as empty; the desk
 * label then shows `empty` and the MA header shows nothing, as before.
 */
export function consoleInfoSource(deps: ConsoleInfoDeps): () => ConsoleInfoState {
  return () => {
    const execIndex = deps.appState.selExec;
    return {
      sideTab: deps.sideTabs.current,
      feature: deps.feature(),
      selected: deps.selection.ids.length,
      execIndex,
      execName: deps.execs[execIndex]?.name ?? '',
    };
  };
}
