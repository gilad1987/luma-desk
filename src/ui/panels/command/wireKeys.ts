import { byId } from '../../dom';
import type { CommandLineDeps } from './CommandLineDeps';

/**
 * The eight keys under the command line. CLEAR first empties a half-typed command (quirk Q18). FAN and HIGHLT do not
 * light themselves: the fast tick shows the state (quirk Q10, orig:2539).
 */
export function wireKeys(input: HTMLInputElement, deps: CommandLineDeps): void {
  const { state, selection } = deps;
  byId('kStore').onclick = () => deps.store.set(!deps.store.active);
  byId('kClear').onclick = () => {
    if (input.value.trim()) input.value = '';
    else deps.programmer.clearPress();
  };
  byId('kHigh').onclick = () => {
    state.highlight = !state.highlight;
  };
  byId('kFan').onclick = () => {
    state.fanMode = !state.fanMode;
    deps.fanToggled();
  };
  byId('kAll').onclick = () => selection.set(deps.lightIds());
  byId('kOdd').onclick = () => selection.set(selection.ids.filter((_, i) => i % 2 === 0));
  byId('kEven').onclick = () => selection.set(selection.ids.filter((_, i) => i % 2 === 1));
  byId('kRev').onclick = () => {
    selection.reverse();
    deps.bus.emit('message', { kind: 'log', text: 'Selection order reversed', level: '' });
  };
}
