import type { Statement, StatementOf } from '../statements';
import type { CommandDeps } from './CommandDeps';
import { runApplyPreset } from './runApplyPreset';
import { runCueFade, runDeleteCue, runLabel } from './runCueEdit';
import { runGo, runGotoCue, runOff, runPause, runSelectExec } from './runPlayback';
import { runLevel, runSelect } from './runSelection';
import { runStoreCue, runStoreGroup, runStorePreset } from './runStore';

/**
 * Applies one statement to the engine. Operator mistakes throw `CommandError`; nothing already applied is undone. The
 * switch is exhaustive, so a new statement kind fails lint until it has a runner.
 */
export function runStatement(statement: Statement, deps: CommandDeps): void {
  switch (statement.kind) {
    case 'select':
      return runSelect(statement, deps);
    case 'level':
      return runLevel(statement, deps);
    case 'storeGroup':
      return runStoreGroup(statement, deps);
    case 'storePreset':
      return runStorePreset(statement, deps);
    case 'storeCue':
      return runStoreCue(statement, deps);
    case 'selectExec':
      return runSelectExec(statement, deps);
    case 'go':
      return runGo(statement, deps);
    case 'gotoCue':
      return runGotoCue(statement, deps);
    case 'pause':
      return runPause(statement, deps);
    case 'off':
      return runOff(statement, deps);
    case 'clear':
    case 'clearAll':
      return runClear(statement, deps);
    case 'applyPreset':
      return runApplyPreset(statement, deps);
    case 'deleteCue':
      return runDeleteCue(statement, deps);
    case 'label':
      return runLabel(statement, deps);
    case 'toggleHighlight':
    case 'toggleBlackout':
      return runToggle(statement, deps);
    case 'cueFade':
      return runCueFade(statement, deps);
  }
}

/** Clear is one press of the CLEAR key, so a quick second Clear clears all; Clear All does it at once. */
function runClear({ kind }: StatementOf<'clear' | 'clearAll'>, { programmer }: CommandDeps): void {
  if (kind === 'clear') programmer.clearPress();
  else programmer.clearAll();
}

/** Flips the highlight or the blackout switch. */
function runToggle({ kind }: StatementOf<'toggleHighlight' | 'toggleBlackout'>, { state }: CommandDeps): void {
  if (kind === 'toggleHighlight') state.highlight = !state.highlight;
  else state.blackout = !state.blackout;
}
