/**
 * Opens or closes a `wa-drawer`. It sets both forms of the state, as `setWaDisabled` does for a button: the `open`
 * attribute, which the element reads before it upgrades (and which a test DOM keeps), and the `open` property, which
 * an upgraded drawer watches to run its show and hide animation; a property set alone may not reflect back in time.
 */
export function setWaOpen(drawer: HTMLElement, isOpen: boolean): void {
  drawer.toggleAttribute('open', isOpen);
  if ('open' in drawer) drawer.open = isOpen;
}
