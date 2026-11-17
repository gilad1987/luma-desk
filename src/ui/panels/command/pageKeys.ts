import type { CommandLineDeps } from './CommandLineDeps';

/** Focus is in a form field: the page keys leave the keystroke to it. */
const typingInField = (): boolean => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName ?? '');

/**
 * The page keyboard (document, bubble phase; register it before the guide's and fullscreen's capture listeners).
 * Space is GO+ on the selected executor, Escape leaves store mode, and any other printable key starts typing a
 * command. With a dialog open only Escape works, and closes it.
 */
export function listenPageKeys(input: HTMLInputElement, deps: CommandLineDeps): void {
  document.addEventListener('keydown', (ev) => {
    if (typingInField() || deps.guideOrTourOpen()) return;
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
