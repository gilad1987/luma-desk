import { isTextField } from '../../shared';
import type { CommandLineDeps } from './CommandLineDeps';

/** Focus is in a form field: the page keys leave the keystroke to it. */
const typingInField = (): boolean => isTextField(document.activeElement);

/**
 * The page keyboard. Space is GO+ on the selected executor, Escape leaves store mode, and any other printable key
 * starts typing a command. With a dialog open only Escape works, and closes it; with the Stage Builder open none works. It must stay a bubble listener on
 * `document`: the guide Escape and fullscreen F listeners are capture listeners on `document`, so they run before it
 * whatever the registration order. That is what makes Escape end the tour and then also leave store mode (quirk Q7),
 * and F (stopped by fullscreen) never focus the command line. Registration order does not matter here.
 */
export function listenPageKeys(input: HTMLInputElement, deps: CommandLineDeps): void {
  document.addEventListener('keydown', (ev) => {
    if (typingInField() || deps.guideOrTourOpen() || deps.builderOpen()) return;
    if (deps.modal.isOpen()) {
      if (ev.key === 'Escape') deps.modal.close();
      return;
    }
    if (ev.code === 'Space') {
      ev.preventDefault();
      const e = deps.execs[deps.state.selExec];
      if (e) deps.pool.go(e, 1);
      return;
    }
    if (ev.key === 'Escape') {
      deps.store.set(false);
      return;
    }
    if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey) input.focus();
  });
}
