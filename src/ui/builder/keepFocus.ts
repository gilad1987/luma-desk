/**
 * Replaces the children of `root` with `parts`, then gives the keyboard focus back to the new control with the same
 * `data-focus-key` as the control that has it now, with the caret where it was in a text field. The panels rebuild
 * their DOM after every session change, so without this one typed value would throw a keyboard user out of the panel.
 * The render runs after Tab moved the focus (`mountTools`), so "now" is the next field, not the edited one.
 * The keys are set where the controls are made (`labelled`, `makeButton`, `makeCheckbox`); a control without a key
 * loses the focus. Keys must be unique in one panel, or the focus goes to the first match (tests/unit/ui/builder/focusKeys).
 */
export function renderKeepingFocus(root: HTMLElement, parts: readonly HTMLElement[]): void {
  const active = document.activeElement;
  const had = active instanceof HTMLElement && root.contains(active) ? active : null;
  const key = had?.dataset['focusKey'];
  root.replaceChildren(...parts);
  if (!had || key === undefined) return;
  const next = root.querySelector(`[data-focus-key="${CSS.escape(key)}"]`);
  if (!(next instanceof HTMLElement)) return;
  next.focus();
  if (had instanceof HTMLInputElement && next instanceof HTMLInputElement) restoreCaret(had, next);
}

/** Only a text field has a caret; a number input reports none (`selectionStart` is null), so it is left alone. */
function restoreCaret(had: HTMLInputElement, next: HTMLInputElement): void {
  const { selectionStart, selectionEnd } = had;
  if (typeof selectionStart !== 'number' || typeof selectionEnd !== 'number') return;
  next.setSelectionRange(selectionStart, selectionEnd);
}
