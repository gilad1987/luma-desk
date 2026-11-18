import type { Programmer } from '../Programmer';
import type { ProgrammerDeps } from './ProgrammerDeps';

/** A second CLEAR within this many milliseconds of the first is Clear All (quirk B8, orig:1837-1843). */
const DOUBLE_PRESS_MS = 400;

/**
 * One press of the CLEAR key. It clears one layer at a time, the selection first and then the programmer with the
 * highlight, so a single press never loses the programmer by surprise; a quick double press clears everything.
 * `lastClear` is the clock time (ms) of the previous press; the return value is this press's time, for the next press.
 */
export function clearPress(p: Programmer, deps: ProgrammerDeps, lastClear: number): number {
  const { selection, state, clock, bus } = deps;
  const t = clock.nowMs();
  if (t - lastClear < DOUBLE_PRESS_MS) p.clearAll();
  else if (selection.ids.length) {
    selection.set([]);
    bus.emit('message', { kind: 'log', text: 'Clear Selection', level: '' });
  } else {
    p.clear();
    state.highlight = false;
    bus.emit('message', { kind: 'log', text: 'Clear Programmer', level: '' });
  }
  bus.emit('stateDirty', undefined);
  return t;
}
