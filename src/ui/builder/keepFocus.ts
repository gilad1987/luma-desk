/**
 * Replaces the children of `root` with `parts`, then gives the keyboard focus back to the new control with the same
 * `data-focus-key` as the control that had it, with the caret where it was in a text field. The panels rebuild their
 * DOM after every session change, so without this one typed value would throw a keyboard user out of the panel.
 * The keys are set where the controls are made (`labelled`, `makeButton`); a control without a key loses the focus.
 */
export function renderKeepingFocus(root: HTMLElement, parts: readonly HTMLElement[]): void {
  const active = document.activeElement;
  const had = active instanceof HTMLElement && isWithin(root, active) ? active : null;
  const key = had?.dataset['focusKey'];
  root.replaceChildren(...parts);
  if (!had || key === undefined) return;
  const next = parts.map((part) => withKey(part, key)).find((found) => found !== null);
  if (!next) return;
  next.focus();
  if (had instanceof HTMLInputElement && next instanceof HTMLInputElement) restoreCaret(had, next);
}

/** Only a text field has a caret; a number input reports none (`selectionStart` is null), so it is left alone. */
function restoreCaret(had: HTMLInputElement, next: HTMLInputElement): void {
  const { selectionStart, selectionEnd } = had;
  if (typeof selectionStart !== 'number' || typeof selectionEnd !== 'number') return;
  next.setSelectionRange(selectionStart, selectionEnd);
}

function isWithin(root: Element, el: Element): boolean {
  return root === el || Array.from(root.children).some((child) => isWithin(child, el));
}

function withKey(el: Element, key: string): HTMLElement | null {
  if (el instanceof HTMLElement && el.dataset['focusKey'] === key) return el;
  for (const child of Array.from(el.children)) {
    const found = withKey(child, key);
    if (found) return found;
  }
  return null;
}
