import type { Statement, StatementOf } from '../statements';
import type { CommandDeps } from './CommandDeps';
import { runApplyPreset } from './runApplyPreset';
import { runCueFade, runDeleteCue, runLabel } from './runCueEdit';
import { runGo, runGotoCue, runOff, runPause, runSelectExec } from './runPlayback';
import { runLevel, runSelect } from './runSelection';
import { runStoreCue, runStoreGroup, runStorePreset } from './runStore';

type StatementRunners = { readonly [K in Statement['kind']]: (statement: StatementOf<K>, deps: CommandDeps) => void };

/** One runner per statement kind; the mapped type makes a new kind fail to compile until it has a runner. */
const RUNNERS: StatementRunners = {
  select: runSelect,
  level: runLevel,
  storeGroup: runStoreGroup,
  storePreset: runStorePreset,
  storeCue: runStoreCue,
  selectExec: runSelectExec,
  go: runGo,
  gotoCue: runGotoCue,
  pause: runPause,
  off: runOff,
  clear: (_statement, { programmer }) => programmer.clearPress(),
  clearAll: (_statement, { programmer }) => programmer.clearAll(),
  applyPreset: runApplyPreset,
  deleteCue: runDeleteCue,
  label: runLabel,
  toggleHighlight: (_statement, { state }) => {
    state.highlight = !state.highlight;
  },
  toggleBlackout: (_statement, { state }) => {
    state.blackout = !state.blackout;
  },
  cueFade: runCueFade,
};

/** Applies one statement to the engine. Operator mistakes throw `CommandError`; nothing already applied is undone. */
export function runStatement(statement: Statement, deps: CommandDeps): void {
  // TypeScript cannot correlate `statement.kind` with the runner's parameter, but RUNNERS is keyed by that same kind
  const run = RUNNERS[statement.kind] as (statement: Statement, deps: CommandDeps) => void;
  run(statement, deps);
}
