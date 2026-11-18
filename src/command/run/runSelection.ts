import { CommandError } from '../CommandError';
import type { SelectionSource, StatementOf } from '../statements';
import type { CommandDeps } from './CommandDeps';
import { log } from './log';

/** The fixture ids a selection statement names, now; a single id is kept even if the rig lacks it. */
function idsOf(source: SelectionSource, { rig, groups }: CommandDeps): readonly number[] {
  switch (source.kind) {
    case 'fixtures':
      if (source.thru === undefined) return [source.first];
      return rig.range(Math.min(source.first, source.thru), Math.max(source.first, source.thru));
    case 'group': {
      const group = groups.all[source.group];
      if (!group) throw new CommandError(`Group ${source.group} is empty`);
      return [...group.ids];
    }
    case 'all':
      return rig.lightIds();
  }
}

/** Selects fixtures, merging as the parser decided; an empty list is an error and leaves the selection alone. */
export function runSelect(statement: StatementOf<'select'>, deps: CommandDeps): void {
  const ids = idsOf(statement.source, deps);
  if (!ids.length) throw new CommandError('No fixtures match');
  deps.selection.set(ids, statement.merge);
}

/** Sets the dimmer of every selected fixture in the programmer and reports the count. */
export function runLevel({ value }: StatementOf<'level'>, { selection, programmer, bus }: CommandDeps): void {
  if (!selection.ids.length) throw new CommandError('No selection');
  selection.ids.forEach((id) => programmer.set(id, 'dim', value));
  log(bus, `${selection.ids.length} fixtures At ${value}`, 'ok');
}
