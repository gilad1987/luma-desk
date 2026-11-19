/**
 * The Web Awesome events the builder listens to; a later phase adds the drawer's `wa-show`/`wa-hide` when it needs
 * them.
 */
export type WaEventName = 'wa-reposition';

/**
 * Listens for one Web Awesome event and returns the disposer that removes the same listener (rule U6), so a builder
 * part that listens on enter can let go on exit. The name is typed, so a misspelt event fails at compile time instead
 * of never firing.
 */
export function listenWa(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  name: WaEventName,
  handler: (ev: Event) => void,
): () => void {
  target.addEventListener(name, handler);
  return () => target.removeEventListener(name, handler);
}
