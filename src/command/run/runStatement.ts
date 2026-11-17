import type { Statement } from '../statements';
import type { CommandDeps } from './CommandDeps';
import { runApplyPreset } from './runApplyPreset';
import { runCueFade, runDeleteCue, runLabel } from './runCueEdit';
import { runGo, runGotoCue, runOff, runPause, runSelectExec } from './runPlayback';
import { runLevel, runSelect } from './runSelection';
import { runStoreCue, runStoreGroup, runStorePreset } from './runStore';

/** Applies one statement to the engine. Operator mistakes throw `CommandError`; nothing already applied is undone. */
export function runStatement(statement: Statement, deps: CommandDeps): void {
  const { programmer, state } = deps;
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
      return programmer.clearPress();
    case 'clearAll':
      return programmer.clearAll();
    case 'applyPreset':
      return runApplyPreset(statement, deps);
    case 'deleteCue':
      return runDeleteCue(statement, deps);
    case 'label':
      return runLabel(statement, deps);
    case 'toggleHighlight':
      state.highlight = !state.highlight;
      return;
    case 'toggleBlackout':
      state.blackout = !state.blackout;
      return;
    case 'cueFade':
      return runCueFade(statement, deps);
  }
}
