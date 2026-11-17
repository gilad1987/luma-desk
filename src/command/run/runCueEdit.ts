import { cueAt } from '../../engine/CueList';
import { CommandError } from '../CommandError';
import type { StatementOf } from '../statements';
import type { CommandDeps } from './CommandDeps';
import { executorAt } from './executorAt';
import { findCue } from './findCue';
import { log } from './log';

/** Deletes a cue of the selected executor and keeps the current cue index inside the shorter list; saves. */
export function runDeleteCue({ cue }: StatementOf<'deleteCue'>, { pool, state, bus }: CommandDeps): void {
  const executor = executorAt(pool, state.selExec, 'reading', 'cues');
  const index = findCue(executor, cue);
  executor.cues.splice(index, 1);
  executor.invalidate();
  if (executor.cur >= executor.cues.length) executor.cur = executor.cues.length - 1;
  log(bus, `Deleted Cue ${cue}`, 'ok');
  bus.emit('showChanged', undefined);
}

/**
 * Names a cue of the selected executor, a group or an executor; saves. Quirk C6: the name goes into the log as-is,
 * and the UI inserts log text as HTML. A missing cue reports "Cue not found", unlike Goto and Delete.
 */
export function runLabel({ target, num, name }: StatementOf<'label'>, deps: CommandDeps): void {
  const { pool, state, groups, bus } = deps;
  if (target === 'cue') {
    const cue = executorAt(pool, state.selExec, 'reading', 'cues').cues.find((c) => c.num === num);
    if (!cue) throw new CommandError('Cue not found');
    cue.name = name;
  } else if (target === 'group') {
    const group = groups.all[num];
    if (!group) throw new CommandError('Group empty');
    group.name = name;
    bus.emit('poolsChanged', undefined);
  } else {
    executorAt(pool, num - 1, 'setting', 'name').name = name;
  }
  log(bus, `Labelled ${target} ${num}: ${name}`, 'ok');
  bus.emit('showChanged', undefined);
}

/** Quirk C4: changes the current cue's fade of the selected executor without saving; silent when no cue is active. */
export function runCueFade({ seconds }: StatementOf<'cueFade'>, { pool, state, bus }: CommandDeps): void {
  const executor = executorAt(pool, state.selExec, 'reading', 'cur');
  if (executor.cur < 0) return;
  cueAt(executor.cues, executor.cur).fade = seconds;
  log(bus, `Cue fade = ${seconds}s`, 'ok');
}
