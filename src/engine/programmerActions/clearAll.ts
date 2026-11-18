import type { Programmer } from '../Programmer';
import type { ProgrammerDeps } from './ProgrammerDeps';

/** Clear All (double CLEAR or the `clearall` command): selection, programmer and highlight go back to rest. */
export function clearAll(p: Programmer, { selection, state, bus }: ProgrammerDeps): void {
  selection.set([]);
  p.clear();
  state.highlight = false;
  bus.emit('message', { kind: 'log', text: 'Clear All', level: 'ok' });
}
