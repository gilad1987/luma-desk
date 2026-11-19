import { afterWaRender } from './wa/waRender';

/**
 * Gives the focus to the next enabled button after `from`, else the nearest one before it, in the order of `buttons`:
 * Delete, or the last Undo, turns its own focused button off, which would drop a keyboard user's focus to `<body>`.
 * It runs after the paint, so a button that turned on in the same paint (Redo after Undo) can take it; the focus waits
 * for that button's render, since a `wa-button` whose inner button is still disabled refuses it (`afterWaRender`).
 */
export function focusNearEnabled<A>(
  buttons: ReadonlyMap<A, HTMLElement>,
  from: A,
  isOff: (action: A) => boolean,
): void {
  const order = [...buttons.keys()];
  const at = order.indexOf(from);
  const target = [...order.slice(at + 1), ...order.slice(0, at).reverse()].find((action) => !isOff(action));
  const button = target === undefined ? undefined : buttons.get(target);
  if (button) afterWaRender(button, () => button.focus());
}
