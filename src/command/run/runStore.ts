import { CommandError } from '../CommandError';
import type { StatementOf } from '../statements';
import type { CommandDeps } from './CommandDeps';
import { isPresetType } from './isPresetType';

/** Records the selection as group `group`. Every Store form leaves store mode after a successful store. */
export function runStoreGroup({ group }: StatementOf<'storeGroup'>, { groups, selection, state }: CommandDeps): void {
  groups.store(group, selection.ids);
  state.setStoreMode(false);
}

/** Records the programmer values of the selection as preset `type.slot`; slot 0 or NaN is a usage error. */
export function runStorePreset({ ref }: StatementOf<'storePreset'>, deps: CommandDeps): void {
  if (!isPresetType(deps.presets, ref.type) || !ref.slot) throw new CommandError('Use Store Preset 4.12');
  deps.presets.storeFromProgrammer(ref.type, ref.slot, deps.selection.ids, deps.programmer.vals);
  deps.state.setStoreMode(false);
}

/** Records a cue on the given executor, or on the one selected when the statement runs. */
export function runStoreCue(statement: StatementOf<'storeCue'>, { pool, programmer, state }: CommandDeps): void {
  const exec = statement.exec ?? state.selExec;
  if (pool.execs[exec] === undefined) throw new CommandError('No such executor');
  programmer.storeCue(exec, statement.cue, statement.fade === undefined ? {} : { fade: statement.fade });
  state.setStoreMode(false);
}
